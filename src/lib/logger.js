let fs = require('fs-extra'),
    _jobLogs = {},
    _global,
    winston = require('winston-wrapper'),
    path = require('path'),
    settings = require('./settings')

class Logger {

    constructor(logFolder){

        if (!fs.existsSync(logFolder))
            fs.mkdirSync(logFolder)

        // apply rotation override for winston
        this.info = winston.new(logFolder).info
        this.error = winston.new(logFolder).error.error
    }
}

module.exports = {
    
    // inits the global log, this is used by trusty-daemon for its own errors.
    global : async function(){
        if (!_global)
            _global = new Logger(settings.logPath)

        return _global
    },

    // initializes loggers used for each job
    initializeJobs : async function(){
        for(const jobName in settings.jobs) {
            const job = settings.jobs[jobName],
                logpath = path.join(settings.logPath, job.__safeName, 'logs')
            
            await fs.ensureDir(logpath)
            _jobLogs[job.name] = new Logger(logpath)
        }
    },

    // returns an instance of logger
    instance : function(jobName) {
        return _jobLogs[jobName]
    }

};