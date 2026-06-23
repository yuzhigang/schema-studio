export type SchemaFieldType = "integer" | "text" | "boolean";

export type SchemaField = {
  id: string;
  name: string;
  logicalName: string;
  dataType: SchemaFieldType;
  length: number;
  primaryKey: boolean;
  notNull: boolean;
  autoIncrement: boolean;
  updated: boolean;
  description: string;
};

export type SchemaTable = {
  id: string;
  name: string;
  logicalName: string;
  description: string;
  fields: SchemaField[];
};

export type SchemaFolder = {
  id: string;
  name: string;
  count: number;
  tables: SchemaTable[];
};

export type SchemaProject = {
  id: string;
  name: string;
  count: number;
  color: string;
};

export type TableMetadata = Pick<SchemaTable, "name" | "logicalName" | "description">;

export const schemaProjects: SchemaProject[] = [
  { id: "dispatch", name: "一体化调度系统", count: 4, color: "bg-blue-500" },
  { id: "environment", name: "能源环保系统", count: 5, color: "bg-orange-500" },
  { id: "quality-trace", name: "质量追溯系统", count: 3, color: "bg-emerald-500" },
  { id: "energy-manage", name: "能源管理系统", count: 2, color: "bg-amber-500" },
  { id: "schedule", name: "一体化排程系统", count: 6, color: "bg-red-500" },
  { id: "simulation", name: "能源仿真系统", count: 4, color: "bg-teal-500" },
  { id: "quality-manage", name: "质量管理系统", count: 7, color: "bg-violet-500" },
  { id: "order-design", name: "订单设计系统", count: 4, color: "bg-pink-500" },
  { id: "plan-schedule", name: "计划排程系统", count: 5, color: "bg-cyan-500" },
];

export const schemaFolders: SchemaFolder[] = [
  {
    id: "common",
    name: "01-公共对象定义",
    count: 2,
    tables: [
      {
        id: "app-stage-definition",
        name: "APPStageDefinition",
        logicalName: "工序操作阶段的定义",
        description: "工序操作阶段的定义",
        fields: [
          createField("Id", "ID", "integer", 64, "ID号"),
          createField("Code", "定义编码", "text", 64, "阶段定义编码"),
          createField("Name", "中文名称", "text", 64, "中文名称"),
        ],
      },
      {
        id: "event-definition",
        name: "EventDefinition",
        logicalName: "生产事件定义表",
        description: "生产事件定义表（包括对一个工序过程的定义）",
        fields: [
          createField("Id", "ID", "integer", 64, "ID号，使用自编码的ID号代表了特殊含义", {
            primaryKey: true,
            autoIncrement: true,
          }),
          createField("Code", "定义编码", "text", 64, "事件定义编码", { primaryKey: true }),
          createField(
            "AliasCode",
            "别名编码",
            "text",
            64,
            "别名编码，定义Code和AliasCode的双重含义，如：bof.start...",
            { primaryKey: true },
          ),
          createField("Name", "中文名称", "text", 64, "中文名称", { primaryKey: true }),
          createField("Icon", "Icon", "text", 128, "Icon", { primaryKey: true }),
          createField(
            "ShortCode",
            "简写码",
            "text",
            16,
            "简写码，用来返回给json等数据的名称，不应出现中划线以及点等字符",
            { primaryKey: true },
          ),
          createField("MapCode", "事件编码映射", "text", 64, "映射到第三方系统", {
            primaryKey: true,
          }),
          createField(
            "IsStatic",
            "是否是静态",
            "boolean",
            1,
            "是否是静态的，系统内置的，不可删除的",
            {
              primaryKey: true,
            },
          ),
          createField(
            "IsActive",
            "是否是激活的",
            "boolean",
            1,
            "是否是静态的，系统内置的，不可删除的",
            {
              primaryKey: true,
            },
          ),
          createField(
            "Category",
            "默认分类",
            "text",
            64,
            "默认分类，可为空，取值为： heat， ladle， slab",
            {
              primaryKey: true,
            },
          ),
          createField(
            "Process",
            "所属工序",
            "text",
            64,
            "默认分类，可为空，取值为： heat， ladle， slab",
            {
              primaryKey: true,
            },
          ),
          createField(
            "Kind",
            "事件类型",
            "text",
            64,
            "默认分类，可为空，取值为： heat， ladle， slab",
            {
              primaryKey: true,
            },
          ),
          createField(
            "Multiple",
            "是否是多个值",
            "boolean",
            64,
            "默认分类，可为空，取值为： heat， ladle， slab",
            {
              primaryKey: true,
            },
          ),
          createField(
            "Remark",
            "备注信息",
            "text",
            64,
            "默认分类，可为空，取值为： heat， ladle， slab",
            {
              primaryKey: true,
            },
          ),
          createField(
            "Rank",
            "顺序值",
            "integer",
            64,
            "默认分类，可为空，取值为： heat， ladle， slab",
            {
              primaryKey: true,
            },
          ),
        ],
      },
    ],
  },
  {
    id: "gantt",
    name: "041-甘特图",
    count: 1,
    tables: [
      {
        id: "job-item",
        name: "JobItem",
        logicalName: "全工序作业计划",
        description: "全工序作业计划",
        fields: [
          createField("Id", "ID", "integer", 64, "ID号", { primaryKey: true }),
          createField("Code", "计划编码", "text", 64, "计划编码"),
          createField("Name", "作业名称", "text", 64, "作业名称"),
        ],
      },
    ],
  },
  {
    id: "material-analysis",
    name: "063-物料分析",
    count: 3,
    tables: [
      {
        id: "sample-record",
        name: "SampleRecord",
        logicalName: "采样记录",
        description: "采样记录",
        fields: [
          createField("Id", "ID", "integer", 64, "ID号", { primaryKey: true }),
          createField("MaterialCode", "物料编码", "text", 64, "物料编码"),
          createField("SampleTime", "采样时间", "text", 64, "采样时间"),
        ],
      },
      {
        id: "sample-result",
        name: "SampleResult",
        logicalName: "采样结果详情记录",
        description: "采样结果详情记录",
        fields: [
          createField("Id", "ID", "integer", 64, "ID号", { primaryKey: true }),
          createField("SampleId", "采样ID", "integer", 64, "采样ID"),
          createField("ResultValue", "结果值", "text", 64, "结果值"),
        ],
      },
      {
        id: "material-measure",
        name: "MaterialMeasure",
        logicalName: "物料的测量信息",
        description: "物料的测量信息",
        fields: [
          createField("Id", "ID", "integer", 64, "ID号", { primaryKey: true }),
          createField("MeasureCode", "测量编码", "text", 64, "测量编码"),
          createField("Value", "测量值", "text", 64, "测量值"),
        ],
      },
    ],
  },
  {
    id: "directory",
    name: "目录5",
    count: 5,
    tables: [],
  },
];

export const initialProjectId = schemaProjects[0].id;
export const initialTableId = "event-definition";

export function findTableById(tableId: string, folders = schemaFolders) {
  for (const folder of folders) {
    const table = folder.tables.find((item) => item.id === tableId);
    if (table) {
      return table;
    }
  }

  return folders.flatMap((folder) => folder.tables)[0];
}

export function getTablePath(tableId: string, folders = schemaFolders) {
  const table = findTableById(tableId, folders);
  const folder = folders.find((item) => item.tables.some((tableItem) => tableItem.id === table.id));

  return {
    projectName: schemaProjects[0].name,
    folderName: folder?.name ?? "",
    table,
  };
}

function createField(
  name: string,
  logicalName: string,
  dataType: SchemaFieldType,
  length: number,
  description: string,
  options: Partial<Pick<SchemaField, "primaryKey" | "notNull" | "autoIncrement" | "updated">> = {},
) {
  return {
    id: name.toLowerCase(),
    name,
    logicalName,
    dataType,
    length,
    primaryKey: options.primaryKey ?? false,
    notNull: options.notNull ?? false,
    autoIncrement: options.autoIncrement ?? true,
    updated: options.updated ?? true,
    description,
  };
}
