import type Winston from "winston"
import { createRequire } from "module"

const require = createRequire(import.meta.url)
const winston = require("winston") as {
  transports: { Console: new (opts: unknown) => unknown }
  format: {
    combine: (...formats: unknown[]) => unknown
    colorize: () => unknown
    simple: () => unknown
  }
  configure: (opts: unknown) => void
  loggers: {
    add: (name: string, opts: unknown) => void
    get: (name: string) => Winston.Logger
  }
}

const loggingLevel = "warn"

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
  ),
})

// Configure the default logger (used by modules that do `import log from "winston"`)
winston.configure({
  level: loggingLevel,
  transports: [consoleTransport],
})

// Configure the named "log" container (used by modules that do `winston.loggers.get("log")`)
winston.loggers.add("log", {
  level: loggingLevel,
  transports: [consoleTransport],
})

const log = winston.loggers.get("log")
export default log
