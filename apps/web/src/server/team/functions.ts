import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  assertTeamAdmin,
  assertTeamRole,
  getAuthenticatedUser,
  getServiceClient,
} from "#/server/schema/helpers";

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

// ---------------------------------------------------------------------------
// Team settings: basic profile + ownership/lifecycle
// ---------------------------------------------------------------------------

export const $fetchTeamDetail = createServerFn({ method: "POST" })
  .inputValidator(teamIdSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    const role = await assertTeamRole(user.id, data.teamId, "viewer");

    const service = getServiceClient();
    const { data: team, error } = await service
      .from("team")
      .select("id, name, icon, description, slug")
      .eq("id", data.teamId)
      .is("deleted_at", null)
      .single();

    if (error || !team) {
      throw error ?? new Error("Team not found");
    }

    return {
      id: team.id,
      name: team.name,
      icon: team.icon,
      description: team.description,
      slug: team.slug,
      role: role as (typeof TEAM_ROLES)[number],
    };
  });

const updateTeamSchema = z.object({
  teamId: z.uuid(),
  name: z.string().min(1),
  icon: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const $updateTeam = createServerFn({ method: "POST" })
  .inputValidator(updateTeamSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertTeamAdmin(user.id, data.teamId);

    const service = getServiceClient();
    const { error } = await service
      .from("team")
      .update({
        name: data.name,
        icon: data.icon ?? null,
        description: data.description ?? null,
      })
      .eq("id", data.teamId);

    if (error) {
      throw error;
    }
  });

const transferOwnershipSchema = z.object({
  teamId: z.uuid(),
  targetUserId: z.uuid(),
});

export const $transferTeamOwnership = createServerFn({ method: "POST" })
  .inputValidator(transferOwnershipSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    // Only the current owner may transfer ownership.
    await assertTeamRole(user.id, data.teamId, "owner");

    if (data.targetUserId === user.id) {
      throw new Error("不能移交给自己");
    }

    const service = getServiceClient();
    const { data: target, error: targetError } = await service
      .from("team_member")
      .select("id")
      .eq("team_id", data.teamId)
      .eq("user_id", data.targetUserId)
      .is("deleted_at", null)
      .maybeSingle();

    if (targetError || !target) {
      throw new Error("目标成员不在该团队");
    }

    // Demote current owner to admin, promote target to owner.
    const { error: demoteError } = await service
      .from("team_member")
      .update({ role: "admin" })
      .eq("team_id", data.teamId)
      .eq("user_id", user.id);

    if (demoteError) {
      throw demoteError;
    }

    const { error: promoteError } = await service
      .from("team_member")
      .update({ role: "owner" })
      .eq("id", target.id);

    if (promoteError) {
      throw promoteError;
    }
  });

export const $disbandTeam = createServerFn({ method: "POST" })
  .inputValidator(teamIdSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    // Only the owner may disband the team.
    await assertTeamRole(user.id, data.teamId, "owner");

    const service = getServiceClient();
    const now = new Date().toISOString();

    // Soft-delete the team itself, then soft-delete every membership so the team
    // disappears from everyone's $fetchMyTeams (which filters team_member.deleted_at).
    const { error: teamError } = await service
      .from("team")
      .update({ deleted_at: now })
      .eq("id", data.teamId);

    if (teamError) {
      throw teamError;
    }

    const { error: memberError } = await service
      .from("team_member")
      .update({ deleted_at: now })
      .eq("team_id", data.teamId)
      .is("deleted_at", null);

    if (memberError) {
      throw memberError;
    }
  });

// ---------------------------------------------------------------------------
// Team settings: cross-project member access matrix
// ---------------------------------------------------------------------------

export const $fetchTeamProjectAccess = createServerFn({ method: "POST" })
  .inputValidator(teamIdSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertTeamAdmin(user.id, data.teamId);

    const service = getServiceClient();

    const { data: memberRows, error: memberError } = await service
      .from("team_member")
      .select("id, role, user:user_id(id, email, display_name)")
      .eq("team_id", data.teamId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (memberError) {
      throw memberError;
    }

    const { data: projectRows, error: projectError } = await service
      .from("project")
      .select("id, name, short_code, color")
      .eq("team_id", data.teamId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (projectError) {
      throw projectError;
    }

    const projectIds = (projectRows ?? []).map((project) => project.id);

    let accessRows: { project_id: string; user_id: string; role: string }[] = [];
    if (projectIds.length > 0) {
      const { data: rows, error: accessError } = await service
        .from("project_member")
        .select("project_id, user_id, role")
        .in("project_id", projectIds)
        .is("deleted_at", null);

      if (accessError) {
        throw accessError;
      }
      accessRows = rows ?? [];
    }

    const members = (memberRows ?? []).map((member) => {
      const profile = member.user as unknown as {
        id: string;
        email: string;
        display_name: string | null;
      };
      return {
        id: member.id,
        userId: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        role: member.role as (typeof TEAM_ROLES)[number],
      };
    });

    const projects = (projectRows ?? []).map((project) => ({
      id: project.id,
      name: project.name,
      shortCode: project.short_code ?? project.id,
      color: project.color,
    }));

    const access = accessRows.map((row) => ({
      projectId: row.project_id,
      userId: row.user_id,
      role: row.role as "admin" | "editor" | "viewer",
    }));

    return { members, projects, access };
  });

const setProjectMembersBulkSchema = z.object({
  teamId: z.uuid(),
  changes: z
    .array(
      z.object({
        projectId: z.uuid(),
        userId: z.uuid(),
        role: z.enum(["admin", "editor", "viewer"]).nullable(),
      }),
    )
    .max(500),
});

export const $setProjectMembersBulk = createServerFn({ method: "POST" })
  .inputValidator(setProjectMembersBulkSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertTeamAdmin(user.id, data.teamId);

    const service = getServiceClient();

    // Validate every targeted project belongs to this team before mutating.
    const { data: teamProjects, error: projectError } = await service
      .from("project")
      .select("id")
      .eq("team_id", data.teamId)
      .is("deleted_at", null);

    if (projectError) {
      throw projectError;
    }

    const allowedProjectIds = new Set((teamProjects ?? []).map((project) => project.id));
    for (const change of data.changes) {
      if (!allowedProjectIds.has(change.projectId)) {
        throw new Error("项目不属于该团队");
      }
    }

    const now = new Date().toISOString();

    for (const change of data.changes) {
      // Look up any row (including soft-deleted) — the UNIQUE (project_id, user_id)
      // constraint is not partial, so a fresh insert after a prior revoke would
      // collide. Reactivate the existing row instead.
      const { data: existing } = await service
        .from("project_member")
        .select("id, deleted_at")
        .eq("project_id", change.projectId)
        .eq("user_id", change.userId)
        .maybeSingle();

      if (change.role === null) {
        // Revoke access: soft-delete the row if it is currently active.
        if (existing && !existing.deleted_at) {
          const { error } = await service
            .from("project_member")
            .update({ deleted_at: now })
            .eq("id", existing.id);
          if (error) {
            throw error;
          }
        }
        continue;
      }

      if (existing) {
        // Grant/update: set the role and clear any prior soft-delete.
        const { error } = await service
          .from("project_member")
          .update({ role: change.role, deleted_at: null })
          .eq("id", existing.id);
        if (error) {
          throw error;
        }
      } else {
        const { error } = await service.from("project_member").insert({
          project_id: change.projectId,
          user_id: change.userId,
          role: change.role,
        });
        if (error) {
          throw error;
        }
      }
    }
  });
