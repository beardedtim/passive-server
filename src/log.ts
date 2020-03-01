import create from "pino";

export default create({
  name: "PASSIVE_SERVER",
  level: process.env.LOG_LEVEL || "trace"
});
