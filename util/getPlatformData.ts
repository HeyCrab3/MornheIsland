// 获取中台平台业务数据公共代码
import axios from "axios";

// 类型声明
// Config: { key: value }，value 可以是 boolean / number / string / Object
interface Config {
  [key: string]: boolean | number | string | Object;
}

// FeatureItem: features 中每一项的固定结构
interface FeatureItem {
  enabled: boolean;
  blacklist: Array<any>;
  platforms: Array<any>;
  strategy: string;
  value: any;
  whiteList: Array<any>;
}

// Features: { key: FeatureItem }
interface Features {
  [key: string]: FeatureItem;
}

interface Notices {
  _id: string;
  title: string;
  publishAt: string;
  priority: string;
  platforms: Array<any>;
  content: string;
}

interface Version {
  _id: string,
  version: string,
  platforms: Array<any>,
  forceUpdate: boolean,
  fileSize: number,
  fileHash: string,
  downloadUrl: string
}

type Environment = "dev" | "test" | "prod";

// 通用 Log 方法
const log = (message: string, type?: string) => {
  const format = "[{0}] [中台平台] {1}";
  const msg = format
    .replace("{0}", new Date().toISOString())
    .replace("{1}", message);
  switch (type) {
    case "info":
      console.log(msg);
      break;
    case "warn":
      console.warn(msg);
      break;
    case "error":
      console.error(msg);
      break;
    default:
      console.log(msg);
  }
};

interface MiddleEndData {
  config: Config;
  environment: Environment;
  features: Features;
  notices: Array<Notices>;
  product: string;
  timestamp: string;
  version: Version;
}

// 业务环境
const env = import.meta.env.MODE || "production";
// 业务 SKU
const sku = "mornheisland";

// 处理后环境
const getEnv = () => {
  let k: Environment = "prod";
  switch (env) {
    case "development":
      k = "dev";
      break;
    case "staging":
      k = "test";
      break;
    case "test":
      k = "test";
      break;
    case "production":
      k = "prod";
      break;
    default:
      k = "prod";
  }
  return k;
};

// 拼接URL参数
const getSkuUrl = (sku: string) => {
  const baseUrl =
    "https://middleend-platform.crabapi.cn/api/bootstrap?product={0}&env={1}";
  if (!sku) {
    log("缺少业务SKU", "error");
    throw new TypeError("缺少业务SKU");
  }
  const url = baseUrl.replace("{0}", sku).replace("{1}", getEnv());
  return url;
};

// 获取中台数据结果
const getPlatformData = async () => {
  if (!sku) {
    log("缺少业务SKU", "error");
    throw new TypeError("缺少业务SKU");
  }
  try {
    log(`当前SKU：${sku}，运行环境：${getEnv()}`);
    const url = getSkuUrl(sku);
    const response: MiddleEndData = (await axios.get(url)).data;
    log(response.toString());
    return response;
  } catch (e) {
    log(`发生异常！${e}`, "error");
    return {
      config: {},
      environment: "dev",
      notices: {},
      version: {},
      features: {},
      product: "failed to fetch",
      timestamp: "1970-01-01T08:00:00Z"
    }
  }
};

export { getPlatformData };
export type { MiddleEndData }
