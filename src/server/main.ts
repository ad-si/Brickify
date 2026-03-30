import { exec } from "child_process"
import http from "http"
import path from "path"
import fsp from "fs/promises"

import bootstrap from "bootstrap-styl"
import express from "express"
import bodyParser from "body-parser"
import compress from "compression"
import morgan from "morgan"
import errorHandler from "errorhandler"
import favicon from "serve-favicon"
import stylus from "stylus"
import nib from "nib"
import yaml from "js-yaml"
import cookieParser from "cookie-parser"

import log from "./logger.js"
import * as urlSessions from "./urlSessions.js"
import * as pluginLoader from "./pluginLoader.js"
import app from "../../routes/app.js"
import * as landingPage from "../../routes/landingpage.js"
import * as models from "../../routes/models.js"
import * as dataPackets from "../../routes/dataPackets.js"
import sharelinkGen from "../../routes/share.js"

const __dirname = import.meta.dirname

interface GlobalConfig {
  colors: {
    background: number;
  };
}

const globalConfig = yaml.load(
  await fsp.readFile(path.resolve(__dirname, "../common/globals.yaml"), "utf8")
) as GlobalConfig

const webapp = express()

// Express assumes that no env means develop.
// Therefore override it to make it clear for all
const developmentMode = webapp.get("env") === "development"
if (developmentMode) {
  process.env.NODE_ENV = "development"
  log.info("development mode activated")
}
else {
  log.info("production mode activated")
}



export async function setupRouting (port: number | string): Promise<void> {
  webapp.set("hostname", developmentMode
    ? `localhost:${String(port)}`
    : process.env.HOSTNAME,
  )

  webapp.set("views", path.normalize("views"))
  webapp.set("view engine", "jade")

  webapp.use(favicon(path.normalize("public/img/favicon.ico")))

  webapp.use(compress())

  webapp.use((stylus.middleware as any)({
    src: path.resolve(__dirname, "../../public"),
    dest: path.resolve(__dirname, "../../public"),
    compile (str: string, filePath: string): any {
      return stylus(str)
        .set("filename", filePath || "")
        .set("compress", !developmentMode)
        .set("sourcemap", developmentMode ? {
          comment: true,
          inline: true,
          basePath: path.resolve(__dirname, "../../public")
        } : false)
        .set("include css", true)
        .set("paths", [
          path.resolve(__dirname, "../../public/styles"),
          path.resolve(__dirname, "../../node_modules")
        ])
        .use(nib())
        .use(bootstrap())
      // Ugly because of github.com/LearnBoost/stylus/issues/1828
        .define("backgroundColor", "#" + ("000000" +
        globalConfig.colors.background.toString(16)).slice(-6))
    },
  }))

  webapp.use((_req, res, next) => {
    res.locals.app = webapp
    next()
  })


  const fontAwesomeRegex = /\/fonts\/fontawesome-.*/
  webapp.get(fontAwesomeRegex, express.static("node_modules/font-awesome/"))

  webapp.use(express.static("public"))
  webapp.use("/node_modules", express.static("node_modules"))

  if (developmentMode) {
    webapp.use(morgan("dev", {
      stream: {
        write (str: string) {
          log.info(str.substring(0, str.length - 1))
        },
      },
    },
    ),
    )
  }
  else {
    webapp.use(morgan("combined", {
      stream: {
        write (str: string) {
          log.info(str.substring(0, str.length - 1))
        },
      },
    },
    ),
    )
  }

  webapp.use(cookieParser())
  webapp.use(urlSessions.middleware)

  const jsonParser = bodyParser.json({limit: "100mb"})
  const urlParser = bodyParser.urlencoded({extended: true, limit: "100mb"})
  const rawParser = bodyParser.raw({limit: "100mb"})

  webapp.get("/", landingPage.getLandingpage)
  webapp.get("/contribute", landingPage.getContribute)
  webapp.get("/team", landingPage.getTeam)
  webapp.get("/examples", landingPage.getExamples)
  webapp.get("/app", app)
  webapp.get("/share", sharelinkGen)

  webapp.route("/model/:identifier")
    .head(models.exists)
    .get(models.get)
    .put(rawParser, models.store)

  webapp.post("/datapacket", urlParser, dataPackets.create)
  webapp.route("/datapacket/:id")
    .head(dataPackets.exists)
    .get(dataPackets.get)
    .put(jsonParser, dataPackets.put)
    .delete(dataPackets.delete_)

  webapp.post("/updateGitAndRestart", jsonParser, (request, response): void => {
    if (request.body.ref != null) {
      const {
        ref,
      } = request.body
      if (!((ref.indexOf("develop") >= 0) || (ref.indexOf("master") >= 0))) {
        log.debug('Got a server restart command, but "ref" ' +
          "did not contain develop or master",
        )
        response.send("")
        return
      }
    }
    else {
      log.warn('Got a server restart command without a "ref" ' +
        `json member from ${request.socket.remoteAddress ?? ""}`,
      )
      response.send("")
      return
    }

    response.send("")
    exec("../updateAndRestart.sh", (error, _stdout, _stderr) => {
      if (error) {
        log.warn(`Error while updating server: ${error}`)
      }
    })
  })

  await pluginLoader.loadPlugins(path.resolve(__dirname, "../plugins"))

  if (developmentMode) {
    webapp.use(errorHandler())
  }

  webapp.use((_req, res) => { res
    .status(404)
    .render("404") })
}


interface NodeError extends Error {
  code?: string;
}

export async function startServer (_port?: number | string, _ip?: string): Promise<void> {
  const server = http.createServer(webapp)
  const srvrPort = _port || process.env.NODEJS_PORT || process.env.PORT || 3000
  const srvrIp = _ip || process.env.NODEJS_IP || "127.0.0.1"

  server.on("error", (error: NodeError) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Another server is already listening on ${srvrIp}:${String(srvrPort)}`)
    }
    else {
      console.error("Server could not be started:", error)
    }
    process.exit(1)
  })

  await setupRouting(srvrPort)

  server.listen(
    Number(srvrPort),
    srvrIp,
    () => { console.log(`Server is listening on ${srvrIp}:${String(srvrPort)}`) },
  )
}
