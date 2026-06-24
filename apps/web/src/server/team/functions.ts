import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getAuthenticatedUser, getServiceClient } from "#/server/schema/helpers";

function newId() {
  return crypto.randomUUID();
}

const TEAM_ROLES = ["owner", "admin", "editor", "viewer"] as const;

const findUserSchema = z.object({
  email: z.email(),
});

export const $findUserByEmail = createServerFn({ method: "POST" })
  .inputValidator(findUserSchema)
  .handler(async ({ data }) => {
    await getAuthenticatedUser();
    const service = getServiceClient();

    const { data: profile, error } = await service
      .from("profile")
      .select("id, email, display_name")
      .eq("email", data.email)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.display_name,
    };
  });

const createTeamSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
});

export const $createTeam = createServerFn({ method: "POST" })
  .inputValidator(createTeamSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    const service = getServiceClient();
    const now = new Date().toISOString();

    const { data: team, error } = await service
      .from("team")
      .insert({
        id: newId(),
        name: data.name,
        slug: data.slug || null,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (error || !team) {
      throw error ?? new Error("create team failed");
    }

    const { error: memberError } = await service.from("team_member").insert({
      team_id: team.id,
      user_id: user.id,
      role: "owner",
      created_at: now,
      updated_at: now,
    });

    if (memberError) {
      throw memberError;
    }

    return team.id;
  });

export const $fetchMyTeams = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getAuthenticatedUser();
  const service = getServiceClient();

  const { data, error } = await service
    .from("team_member")
    .select("role, team:team_id(id, short_code, name, slug)")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: (row.team as unknown as { id: string }).id,
    shortCode:
      (row.team as unknown as { short_code: string | null }).short_code ??
      (row.team as unknown as { id: string }).id,
    name: (row.team as unknown as { name: string }).name,
    slug: (row.team as unknown as { slug: string | null }).slug,
    role: row.role as (typeof TEAM_ROLES)[number],
  }));
});

const createInviteSchema = z.object({
  teamId: z.uuid(),
  role: z.enum(["editor", "viewer", "admin"]),
});

export const $createTeamInvite = createServerFn({ method: "POST" })
  .inputValidator(createInviteSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    const service = getServiceClient();

    const { data: membership, error: membershipError } = await service
      .from("team_member")
      .select("role")
      .eq("team_id", data.teamId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (membershipError || !membership) {
      throw new Error("Forbidden");
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Forbidden");
    }

    const token = newId();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: invite, error } = await service
      .from("team_invite")
      .insert({
        team_id: data.teamId,
        invited_by: user.id,
        role: data.role,
        token,
        expires_at: expiresAt,
        created_at: now,
        updated_at: now,
      })
      .select("token")
      .single();

    if (error || !invite) {
      throw error ?? new Error("create invite failed");
    }

    return invite.token;
  });

const joinByInviteSchema = z.object({
  token: z.string().min(1),
});

export const $joinTeamByInvite = createServerFn({ method: "POST" })
  .inputValidator(joinByInviteSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    const service = getServiceClient();

    const { data: invite, error } = await service
      .from("team_invite")
      .select("team_id, role, expires_at, used_at")
      .eq("token", data.token)
      .single();

    if (error || !invite) {
      throw new Error("邀请链接无效");
    }

    if (invite.used_at) {
      throw new Error("邀请链接已被使用");
    }

    if (new Date(invite.expires_at) < new Date()) {
      throw new Error("邀请链接已过期");
    }

    const { data: existing } = await service
      .from("team_member")
      .select("id")
      .eq("team_id", invite.team_id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!existing) {
      const now = new Date().toISOString();
      const { error: joinError } = await service.from("team_member").insert({
        team_id: invite.team_id,
        user_id: user.id,
        role: invite.role as (typeof TEAM_ROLES)[number],
        created_at: now,
        updated_at: now,
      });

      if (joinError) {
        throw joinError;
      }
    }

    const { error: usedError } = await service
      .from("team_invite")
      .update({ used_at: new Date().toISOString() })
      .eq("token", data.token);

    if (usedError) {
      throw usedError;
    }

    return { teamId: invite.team_id };
  });

const teamIdSchema = z.object({
  teamId: z.uuid(),
});

export const $fetchTeamMembers = createServerFn({ method: "POST" })
  .inputValidator(teamIdSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    const service = getServiceClient();

    const { data: membership, error: membershipError } = await service
      .from("team_member")
      .select("role")
      .eq("team_id", data.teamId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (membershipError || !membership) {
      throw new Error("Forbidden");
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Forbidden");
    }

    const { data: members, error } = await service
      .from("team_member")
      .select("id, role, user:user_id(id, email, display_name)")
      .eq("team_id", data.teamId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return (members ?? []).map((member) => {
      const user = member.user as unknown as {
        id: string;
        email: string;
        display_name: string | null;
      };
      return {
        id: member.id,
        userId: user.id,
        email: user.email,
        displayName: user.display_name,
        role: member.role as (typeof TEAM_ROLES)[number],
      };
    });
  });
