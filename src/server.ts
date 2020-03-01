import Koa from "koa";
import Router from "@koa/router";
import body from "koa-body";
import cors from "@koa/cors";
import os from "os";
import * as Influx from "influx";

const db_name = process.env.DB_NAME || "demo_demo_to_delete";
const db_host = process.env.DB_HOST || "localhost";

const influx = new Influx.InfluxDB({
  host: db_host,
  database: db_name,
  schema: [
    {
      measurement: "click_events",
      fields: {
        /**
         * instance_id: ctx.request.body.instance_id,
              event_type: ctx.request.body.type,
              event_id: ctx.request.body.id,
              timestamp: ctx.request.body.timestamp,
              url: ctx.request.body.url,
              client_x: ctx.request.body.clientX,
              client_y: ctx.request.body.clientY,
              target_id: ctx.request.body.target.id,
              target_classes: ctx.request.body.classes.join(" "),
              target_innerHTML: ctx.request.body.target.innerHTML,
              target_innerText: ctx.request.body.target.innerText,
              target_nodeType: ctx.request.body.target.nodeType
         */
        event_type: Influx.FieldType.STRING,
        event_id: Influx.FieldType.STRING,
        timestamp: Influx.FieldType.STRING,
        url: Influx.FieldType.STRING,
        instance_id: Influx.FieldType.STRING,
        client_x: Influx.FieldType.STRING,
        client_y: Influx.FieldType.STRING,
        target_id: Influx.FieldType.STRING,
        target_classes: Influx.FieldType.STRING,
        target_innerHTML: Influx.FieldType.STRING,
        target_innerText: Influx.FieldType.STRING,
        target_nodeType: Influx.FieldType.STRING
      },
      tags: ["host"]
    },
    {
      measurement: "scroll_events",
      fields: {
        /**
         * instance_id: ctx.request.body.instance_id,
              event_type: ctx.request.body.type,
              event_id: ctx.request.body.id,
              timestamp: ctx.request.body.timestamp,
              url: ctx.request.body.url,
              client_x: ctx.request.body.clientX,
              client_y: ctx.request.body.clientY,
              target_id: ctx.request.body.target.id,
              target_classes: ctx.request.body.classes.join(" "),
              target_innerHTML: ctx.request.body.target.innerHTML,
              target_innerText: ctx.request.body.target.innerText,
              target_nodeType: ctx.request.body.target.nodeType
         */
        event_type: Influx.FieldType.STRING,
        event_id: Influx.FieldType.STRING,
        timestamp: Influx.FieldType.STRING,
        url: Influx.FieldType.STRING,
        instance_id: Influx.FieldType.STRING,
        scroll_x: Influx.FieldType.INTEGER,
        scroll_y: Influx.FieldType.INTEGER
      },
      tags: ["host"]
    }
  ]
});

influx.getDatabaseNames().then(names => {
  // Comment out to not create the DB
  if (!names.includes(db_name)) {
    return influx.createDatabase(db_name);
  }

  // Uncomment to delete the DB
  // if (names.includes(db_name)) {
  //   return influx.dropDatabase(db_name);
  // }
});

import log from "./log";

import { Server } from "http";

let instance: Server;

export default {
  log,
  start: (port: number) => {
    const server = new Koa();

    server.context.log = log;
    server.use(cors());

    const router = new Router({
      prefix: "/v1"
    });

    router.post("/", body(), async ctx => {
      if (ctx.request.body.type === "click") {
        influx
          .writePoints([
            {
              measurement: "click_events",
              tags: { host: os.hostname() },
              fields: {
                instance_id: ctx.request.body.instance_id,
                event_type: ctx.request.body.type,
                event_id: ctx.request.body.id,
                timestamp: ctx.request.body.timestamp,
                url: ctx.request.body.url,
                client_x: ctx.request.body.clientX,
                client_y: ctx.request.body.clientY,
                target_id: ctx.request.body.target.id,
                target_classes: ctx.request.body.target.classes.join(" "),
                target_innerHTML: ctx.request.body.target.innerHTML,
                target_innerText: ctx.request.body.target.innerText,
                target_nodeType: ctx.request.body.target.nodeType
              }
            }
          ])
          .catch(err => {
            console.error(`Error saving data to InfluxDB! ${err.stack}`);
          });
      }

      if (ctx.request.body.type === "scroll") {
        influx
          .writePoints([
            {
              measurement: "scroll_events",
              tags: { host: os.hostname() },
              fields: {
                instance_id: ctx.request.body.instance_id,
                event_type: ctx.request.body.type,
                event_id: ctx.request.body.id,
                timestamp: ctx.request.body.timestamp,
                url: ctx.request.body.url,
                scroll_x: ctx.request.body.scroll_x,
                scroll_y: ctx.request.body.scroll_y
              }
            }
          ])
          .catch(err => {
            console.error(`Error saving data to InfluxDB! ${err.stack}`);
          });
      }
      ctx.body = ctx.request.body;
    });

    router.get("/clicks", async ctx => {
      const result = await influx.query(
        `
      select * from click_events
      order by time desc
    `
      );

      ctx.body = result;
    });

    router.get("/scrolls", async ctx => {
      const result = await influx.query(
        `
      select * from scroll_events
      order by time desc
    `
      );

      ctx.body = result;
    });

    server.use(router.routes()).use(router.allowedMethods());

    instance = server.listen(port, () => {
      log.trace("I am listening at " + port);
    });

    return instance;
  },
  stop: (cb: (err: Error | void) => void) => {
    if (instance) {
      instance.close(cb);
    }
  }
};
