const CronJob = require('cron').CronJob,
    settings = require('./settings'),
    logger = require('./logger'),
    sh = require('madscience-node-exec').sh,
    jsonfile = require('jsonfile'),
    path = require('path')
    fs = require('fs-extra'),
    execAsync = require('child_process').exec,
    cronJobs = []

class CronProcess
{
    constructor(config){
        this.config = config
        this.lastRun = null
        this.nextRun = null
        this.logInfo = logger.instance(config.name).info.info.info
        this.logError = logger.instance(config.name).error.error.error
        this.isPassing = false
        this.queuePath = path.join(settings.logPath, this.config.__safeName, 'queue')
        this.errorMessage = 'Checking has not run yet'
        this.busy = false

        this.calcNextRun()
    }

    calcNextRun(){
        if (this.cron)
            this.nextRun = new Date(this.cron.nextDates().toString())
        
    }

    async start(){
        await fs.ensureDir(this.queuePath)
        this.logInfo('Starting ' + this.config.name)
        
        this.cron = new CronJob(this.config.interval, async()=>{
            try
            {
                this.lastRun = new Date()
                this.errorMessage = null
        
                try {
                    await this.refreshQueue()
                    await this.runNext()
                    
                    this.isPassing = true
                } catch(ex){
                    this.logError(`Unhandled exception in ${this.config.name} : ${ex}`);
                    this.isPassing = false
                }

                this.calcNextRun()
               
            } catch (ex){
                this.logError(ex)
            }
        }, null, true, null, null, this.config.runOnStart /*runonitit*/)
    }

    async refreshQueue(){
        if (this.config.type === 'git'){
            let hash
            if (this.config.trigger === 'push'){
                // get remote head
                hash = (await sh({ cmd: `git ls-remote ${this.config.url}`, cwd : this.config.path})).result.split('\n')

                for (const ref of hash){
                    if (!ref.includes(`refs/heads/${this.config.branch}`))
                        continue

                    hash = ref.split('\t')[0]
                }

            } else if (this.config.trigger === 'tag'){
                // get all tags from remote sorted by date, latest first
                hash = (await sh({ cmd :'git ls-remote --tags --sort=-committerdate', cwd : this.config.path})).split('\n')
                if (hash.length)
                    hash = hash[0].split('\t')[1].replace('refs/tags/', '')
            }

            if (!hash)
                return

            const now = new Date(),
                writePath = path.join(this.queuePath, `${hash}.json`)

            if (!await fs.exists(writePath)){
                jsonfile.writeFileSync(writePath, {
                    processed: false,
                    resultFlag : 'pending',
                    logOut : null,
                    type : this.config.trigger,
                    dateCreated : now,
                    hash
                }, { spaces: 4 })

                this.logInfo(`Added to queue - hash ${hash} for job ${this.config.name} `)
            }
        }

        return true
    }

    async runNext(){
        if (this.busy)
            return

        // list files, sorted by date, show only names
        let queueQuery = (await sh({ cmd : 'ls -A1 -t', cwd: this.queuePath })).result,
        files = queueQuery
            .split('\n')            // one file per line
            .filter(file => !!file) // remove empty entries

        if (!files.length)
            return

        let queueFile,
            queueFilePath
            
        if (this.config.iterate === 'latest'){
            // if runnign latest only, check if latest queue item is processed
            queueFilePath = path.join(this.queuePath, files[0])
            queueFile = jsonfile.readFileSync(queueFilePath)
            if (queueFile.processed)
                return

        } else if (this.config.iterate === 'all'){
            // walk the queue fromo latest to oldest until an unprocessed item is found, then run
            throw 'all interate not implemented yet'
        }

        execAsync(this.config.command, { cwd : this.config.path }, (err, result)=>{
            let resultFlag = 'passed'
            if (err){
                resultFlag = 'failed'
                this.logError(err)
            }

            queueFile.resultFlag = resultFlag
            queueFile.processed = true
            queueFile.logOut = result
            queueFile.dateRun = new Date()
            jsonfile.writeFileSync(queueFilePath, queueFile, { spaces: 4 })
            
            this.busy = false
        }) 
    }

}

module.exports = {
    
    cronJobs,

     start : async ()=>{
        for (const watcher in settings.jobs){
            const jobSettings = settings.jobs[watcher]

            if (!jobSettings.enabled)
                continue

            const cronjob = new CronProcess(jobSettings)
            cronJobs.push(cronjob)
            await cronjob.start()
        }

        if (!settings.jobs || !Object.keys(settings.jobs).length)
            console.warn('No watchers were defined in settings file')
    }
}
