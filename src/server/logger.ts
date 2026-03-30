import winston from "winston"

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
