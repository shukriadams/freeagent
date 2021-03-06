// force import .env settings if present
let fs = require('fs-extra'),
    rawSettings,
    process = require('process'),
    sanitize = require('sanitize-filename'),
    yaml = require('js-yaml'),
    settings

if (!fs.existsSync('./settings.yml'))
    throw 'settings.yml not found, exiting'

if (fs.existsSync('./.env'))
    require('custom-env').env()

try {
    const settingsYML = fs.readFileSync('./settings.yml', 'utf8')
    rawSettings = yaml.safeLoad(settingsYML)
} catch (exception) {
    throw {
        text : 'Error reading settings.yml',
        exception
    }
}

// definte defaults
settings = Object.assign({
    version : 1,
    port: 3100,
    logPath : './logs',
    jobs : {}
}, settings)

for (const jobName in rawSettings.jobs){

    const job = rawSettings.jobs[jobName]

    rawSettings.jobs[jobName] = Object.assign({
        
        name : jobName,

        __safeName : sanitize(jobName),

        // enabled field is optional, is always one by default
        enabled : true,
        
        interval : '* * * * *',
    
        path : null,
        
        trigger : 'push', // push|tag

        // stderr output with "warning" in them will be ignored. Experimental and not entirely robust, so
        // disabled by default
        ignoreWarnings : false,

        iterate : 'latest', // all|latest

        runOnStart : false,

        // shell command to run
        command : 'echo "no command set yet"',

        // if true, all console out will be written to log. This can bloat your logs, so use carefully
        logResults : false

    }, job)
}

// definte defaults
settings = Object.assign(settings, rawSettings)

settings.validate=()=>{
    for (const jobName in settings.jobs){
        const job = settings.jobs[jobName]
        
        if (job.type !== 'git')
            throw `Unsupported type ${job.type} in job "${jobName}"`

        if (job.type === 'git' && !['tag', 'push'].includes(job.trigger))
            throw `Unsupported trigger ${job.trigger} in job "${jobName}"`

        if (!job.path)
            throw `Job "${job.trigger}" is missing a 'path'`

        if (!fs.existsSync(job.path))
            throw `Path "${job.path}" for job "${job.trigger}" does not exist`

    }
}

module.exports = settings

