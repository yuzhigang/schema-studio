-- Seed data for schema-studio.
-- Run this in Supabase SQL Editor (service role) after applying the migration.
--
-- Note: this seed inserts a team and a sample project. After you log in,
-- you still need to add yourself to the team via the app or by inserting a
-- row into public.team_member (user_id = auth.uid(), team_id = the team below).

DO $$
DECLARE
  v_team_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  v_project_id uuid := 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';

  v_cat_common_id uuid := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';
  v_cat_gantt_id uuid := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';
  v_cat_material_id uuid := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15';

  v_table_app_stage_id uuid := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16';
  v_table_event_id uuid := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17';
  v_table_job_id uuid := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18';
  v_table_sample_rec_id uuid := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19';
  v_table_sample_res_id uuid := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a1a';
  v_table_material_id uuid := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a1b';

  v_col_app_id uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20';
  v_col_app_code uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21';
  v_col_app_name uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

  v_col_event_id uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23';
  v_col_event_code uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24';
  v_col_event_alias uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25';
  v_col_event_name uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26';
  v_col_event_icon uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a27';
  v_col_event_short uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a28';
  v_col_event_map uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a29';
  v_col_event_static uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a2a';
  v_col_event_active uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a2b';
  v_col_event_category uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a2c';
  v_col_event_process uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a2d';
  v_col_event_kind uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a2e';
  v_col_event_multiple uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a2f';
  v_col_event_remark uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a30';
  v_col_event_rank uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31';

  v_col_job_id uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32';
  v_col_job_code uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
  v_col_job_name uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a34';

  v_col_sample_id uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a35';
  v_col_sample_material uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a36';
  v_col_sample_time uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a37';

  v_col_result_id uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a38';
  v_col_result_sample uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a39';
  v_col_result_value uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a3a';

  v_col_measure_id uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a3b';
  v_col_measure_code uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a3c';
  v_col_measure_value uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a3d';
BEGIN
  -- Team
  INSERT INTO public.team (id, name, slug)
  VALUES (v_team_id, '默认团队', 'default-team')
  ON CONFLICT (id) DO NOTHING;

  -- Project
  INSERT INTO public.project (id, team_id, name, description, color)
  VALUES (v_project_id, v_team_id, '一体化调度系统', '示例项目', 'bg-blue-500')
  ON CONFLICT (id) DO NOTHING;

  -- Categories
  INSERT INTO public.category (id, project_id, name, description) VALUES
    (v_cat_common_id, v_project_id, '01-公共对象定义', '公共对象定义'),
    (v_cat_gantt_id, v_project_id, '041-甘特图', '甘特图相关'),
    (v_cat_material_id, v_project_id, '063-物料分析', '物料分析相关')
  ON CONFLICT (id) DO NOTHING;

  -- Tables
  INSERT INTO public.schema_table (id, project_id, name, logical_name, description) VALUES
    (v_table_app_stage_id, v_project_id, 'APPStageDefinition', '工序操作阶段的定义', '工序操作阶段的定义'),
    (v_table_event_id, v_project_id, 'EventDefinition', '生产事件定义表', '生产事件定义表（包括对一个工序过程的定义）'),
    (v_table_job_id, v_project_id, 'JobItem', '全工序作业计划', '全工序作业计划'),
    (v_table_sample_rec_id, v_project_id, 'SampleRecord', '采样记录', '采样记录'),
    (v_table_sample_res_id, v_project_id, 'SampleResult', '采样结果详情记录', '采样结果详情记录'),
    (v_table_material_id, v_project_id, 'MaterialMeasure', '物料的测量信息', '物料的测量信息')
  ON CONFLICT (id) DO NOTHING;

  -- Columns
  INSERT INTO public.schema_column (
    id, table_id, project_id, name, logical_name, data_type, length,
    primary_key, not_null, auto_increment, updated, unique_flag,
    default_value, comment, description, sort_order
  ) VALUES
    (v_col_app_id, v_table_app_stage_id, v_project_id, 'Id', 'ID', 'integer', 64, false, false, true, true, false, null, null, 'ID号', 1),
    (v_col_app_code, v_table_app_stage_id, v_project_id, 'Code', '定义编码', 'text', 64, false, false, true, true, false, null, null, '阶段定义编码', 2),
    (v_col_app_name, v_table_app_stage_id, v_project_id, 'Name', '中文名称', 'text', 64, false, false, true, true, false, null, null, '中文名称', 3),

    (v_col_event_id, v_table_event_id, v_project_id, 'Id', 'ID', 'integer', 64, true, false, true, true, false, null, null, 'ID号', 1),
    (v_col_event_code, v_table_event_id, v_project_id, 'Code', '定义编码', 'text', 64, true, false, true, true, false, null, null, '事件定义编码', 2),
    (v_col_event_alias, v_table_event_id, v_project_id, 'AliasCode', '别名编码', 'text', 64, true, false, true, true, false, null, null, '别名编码', 3),
    (v_col_event_name, v_table_event_id, v_project_id, 'Name', '中文名称', 'text', 64, true, false, true, true, false, null, null, '中文名称', 4),
    (v_col_event_icon, v_table_event_id, v_project_id, 'Icon', 'Icon', 'text', 128, true, false, true, true, false, null, null, 'Icon', 5),
    (v_col_event_short, v_table_event_id, v_project_id, 'ShortCode', '简写码', 'text', 16, true, false, true, true, false, null, null, '简写码', 6),
    (v_col_event_map, v_table_event_id, v_project_id, 'MapCode', '事件编码映射', 'text', 64, true, false, true, true, false, null, null, '映射到第三方系统', 7),
    (v_col_event_static, v_table_event_id, v_project_id, 'IsStatic', '是否是静态', 'boolean', 1, true, false, true, true, false, null, null, '是否是静态的', 8),
    (v_col_event_active, v_table_event_id, v_project_id, 'IsActive', '是否是激活的', 'boolean', 1, true, false, true, true, false, null, null, '是否是激活的', 9),
    (v_col_event_category, v_table_event_id, v_project_id, 'Category', '默认分类', 'text', 64, true, false, true, true, false, null, null, '默认分类', 10),
    (v_col_event_process, v_table_event_id, v_project_id, 'Process', '所属工序', 'text', 64, true, false, true, true, false, null, null, '所属工序', 11),
    (v_col_event_kind, v_table_event_id, v_project_id, 'Kind', '事件类型', 'text', 64, true, false, true, true, false, null, null, '事件类型', 12),
    (v_col_event_multiple, v_table_event_id, v_project_id, 'Multiple', '是否是多个值', 'boolean', 64, true, false, true, true, false, null, null, '是否是多个值', 13),
    (v_col_event_remark, v_table_event_id, v_project_id, 'Remark', '备注信息', 'text', 64, true, false, true, true, false, null, null, '备注信息', 14),
    (v_col_event_rank, v_table_event_id, v_project_id, 'Rank', '顺序值', 'integer', 64, true, false, true, true, false, null, null, '顺序值', 15),

    (v_col_job_id, v_table_job_id, v_project_id, 'Id', 'ID', 'integer', 64, true, false, true, true, false, null, null, 'ID号', 1),
    (v_col_job_code, v_table_job_id, v_project_id, 'Code', '计划编码', 'text', 64, false, false, true, true, false, null, null, '计划编码', 2),
    (v_col_job_name, v_table_job_id, v_project_id, 'Name', '作业名称', 'text', 64, false, false, true, true, false, null, null, '作业名称', 3),

    (v_col_sample_id, v_table_sample_rec_id, v_project_id, 'Id', 'ID', 'integer', 64, true, false, true, true, false, null, null, 'ID号', 1),
    (v_col_sample_material, v_table_sample_rec_id, v_project_id, 'MaterialCode', '物料编码', 'text', 64, false, false, true, true, false, null, null, '物料编码', 2),
    (v_col_sample_time, v_table_sample_rec_id, v_project_id, 'SampleTime', '采样时间', 'text', 64, false, false, true, true, false, null, null, '采样时间', 3),

    (v_col_result_id, v_table_sample_res_id, v_project_id, 'Id', 'ID', 'integer', 64, true, false, true, true, false, null, null, 'ID号', 1),
    (v_col_result_sample, v_table_sample_res_id, v_project_id, 'SampleId', '采样ID', 'integer', 64, false, false, true, true, false, null, null, '采样ID', 2),
    (v_col_result_value, v_table_sample_res_id, v_project_id, 'ResultValue', '结果值', 'text', 64, false, false, true, true, false, null, null, '结果值', 3),

    (v_col_measure_id, v_table_material_id, v_project_id, 'Id', 'ID', 'integer', 64, true, false, true, true, false, null, null, 'ID号', 1),
    (v_col_measure_code, v_table_material_id, v_project_id, 'MeasureCode', '测量编码', 'text', 64, false, false, true, true, false, null, null, '测量编码', 2),
    (v_col_measure_value, v_table_material_id, v_project_id, 'Value', '测量值', 'text', 64, false, false, true, true, false, null, null, '测量值', 3)
  ON CONFLICT (id) DO NOTHING;

  -- Tree nodes: categories first
  INSERT INTO public.tree_node (
    id, project_id, entity_type, entity_id, parent_id,
    level, path_code, children_count, sort_order
  ) VALUES
    (gen_random_uuid(), v_project_id, 'category', v_cat_common_id, null, 0, '0001', 0, 1),
    (gen_random_uuid(), v_project_id, 'category', v_cat_gantt_id, null, 0, '0002', 0, 2),
    (gen_random_uuid(), v_project_id, 'category', v_cat_material_id, null, 0, '0003', 0, 3)
  ON CONFLICT (project_id, entity_type, entity_id) WHERE deleted_at IS NULL DO NOTHING;

  -- Tree nodes: tables (can now reference category nodes above)
  INSERT INTO public.tree_node (
    id, project_id, entity_type, entity_id, parent_id,
    level, path_code, children_count, sort_order
  ) VALUES
    (gen_random_uuid(), v_project_id, 'table', v_table_app_stage_id, (SELECT id FROM public.tree_node WHERE project_id = v_project_id AND entity_type = 'category' AND entity_id = v_cat_common_id), 1, '0001.0001', 0, 1),
    (gen_random_uuid(), v_project_id, 'table', v_table_event_id, (SELECT id FROM public.tree_node WHERE project_id = v_project_id AND entity_type = 'category' AND entity_id = v_cat_common_id), 1, '0001.0002', 0, 2),
    (gen_random_uuid(), v_project_id, 'table', v_table_job_id, (SELECT id FROM public.tree_node WHERE project_id = v_project_id AND entity_type = 'category' AND entity_id = v_cat_gantt_id), 1, '0002.0001', 0, 1),
    (gen_random_uuid(), v_project_id, 'table', v_table_sample_rec_id, (SELECT id FROM public.tree_node WHERE project_id = v_project_id AND entity_type = 'category' AND entity_id = v_cat_material_id), 1, '0003.0001', 0, 1),
    (gen_random_uuid(), v_project_id, 'table', v_table_sample_res_id, (SELECT id FROM public.tree_node WHERE project_id = v_project_id AND entity_type = 'category' AND entity_id = v_cat_material_id), 1, '0003.0002', 0, 2),
    (gen_random_uuid(), v_project_id, 'table', v_table_material_id, (SELECT id FROM public.tree_node WHERE project_id = v_project_id AND entity_type = 'category' AND entity_id = v_cat_material_id), 1, '0003.0003', 0, 3)
  ON CONFLICT (project_id, entity_type, entity_id) WHERE deleted_at IS NULL DO NOTHING;

  -- Tree nodes: columns
  INSERT INTO public.tree_node (project_id, entity_type, entity_id, parent_id, level, path_code, children_count, sort_order)
  SELECT
    v_project_id,
    'column',
    sc.id,
    tn.id,
    tn.level + 1,
    tn.path_code || '.' || lpad(sc.sort_order::text, 4, '0'),
    0,
    sc.sort_order
  FROM public.schema_column sc
  JOIN public.tree_node tn
    ON tn.project_id = v_project_id
   AND tn.entity_type = 'table'
   AND tn.entity_id = sc.table_id
  WHERE sc.project_id = v_project_id
  ON CONFLICT (project_id, entity_type, entity_id) WHERE deleted_at IS NULL DO NOTHING;
END $$;
