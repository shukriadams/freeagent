const CronJob = require('cron').CronJob,
    settings = require('./settings'),
    logger = require('./logger'),
    execSync = require('child_process').execSync ,
    execAsync = async function(command, options){
        const execAsync = require('child_process').exec
        return new Promise((resolve, reject)=>{
            try {
                options.stdio = 'inherit'
                execAsync(command, options, function(err, result){
                    if (err)
                        return reject(err)

                    resolve(result)
                })  
            }catch(ex){
                resolve(ex)
            }
        })
    },
    cronJobs = []

class CronProcess
{
    constructor(config){
        this.config = config
        this.lastRun = null
        this.nextRun = null
        this.logInfo = logger.instance(config.name).info.info
        this.logError = logger.instance(config.name).error.error
        this.isPassing = false
        this.errorMessage = 'Checking has not run yet'
        this.busy = false

        this.calcNextRun()
    }

    calcNextRun(){
        if (this.cron)
            this.nextRun = new Date(this.cron.nextDates().toString())
        
    }

    start(){
        
        this.logInfo('Starting ' + this.config.name)
        this.cron = new CronJob(this.config.interval, async()=>{
            try
            {
                if (this.busy){
                    this.logInfo(`${this.config.name} check was busy from previous run, skipping`);
                    return
                }
        
                this.busy = true
                await this.work()

            } catch (ex){
                this.logError(ex)
            } finally {
                this.busy = false
            }
        }, null, true, null, null, this.config.runOnStart /*runonitit*/)
    }

    async hasChanged(){
        if (this.config.type === 'git'){
            if (this.config.trigger === 'push'){

            } else if (this.config.trigger === 'tag'){
                
            }
        }

        return true
    }

    async work(){
        this.lastRun = new Date()
        this.errorMessage = null

        if (this.config.enabled === false)
            return

        if (!this.hasChanged())
            return

        try {
            // do work here!
            console.log('work!')
            this.isPassing = true
        } catch(ex){
            this.logError(`Unhandled exception in ${this.config.__name} : ${ex}`);
            this.isPassing = false
        }

        this.calcNextRun()
        
        if (this.errorMessage)
            this.logInfo(this.errorMessage)

        let flag = path.join(settings.logs, this.config.__safeName, 'flag'),
            historyLogFolder = path.join(settings.logs, this.config.__safeName, 'history')

        if (this.isPassing){
            await fs.ensureDir(historyLogFolder)

            jsonfile.writeFileSync(path.join(historyLogFolder, `status.json`), {
                status : 'up',
                url : this.config.url,
                date : this.lastRun
            })

            if (await fs.exists(flag)){

                // site is back up after fail was previous detected, clean up flag and write log
                await fs.remove(flag)

                jsonfile.writeFileSync(path.join(historyLogFolder, `${this.lastRun.getTime()}.json`), {
                    status : 'up',
                    url : this.config.url,
                    date : this.lastRun
                })

                this.logInfo(`Status changed, flag removed for ${this.config.__name}`)
                statusChanged = true
            }
        } else {

            if (!await fs.exists(flag)){

                await fs.ensureDir(historyLogFolder)

                // site is down, write fail flag and log
                jsonfile.writeFileSync(flag, {
                    url : this.config.url,
                    date : new Date()
                })

                jsonfile.writeFileSync(path.join(historyLogFolder, `${this.lastRun.getTime()}.json`), {
                    status : 'down',
                    url : this.config.url,
                    date : new Date()
                })
                
                jsonfile.writeFileSync(path.join(historyLogFolder, `status.json`), {
                    status : 'down',
                    url : this.config.url,
                    date : this.lastRun
                })

                this.logInfo(`Status changed, flag created for ${this.config.__name}`)
                statusChanged = true
            }
        }

    }
}

module.exports = {
    
    cronJobs,

     start : async ()=>{
        for (const watcher in settings.jobs){
            const cronjob = new CronProcess(settings.jobs[watcher])
            cronJobs.push(cronjob)
            cronjob.start()
        }

        if (!settings.jobs || !Object.keys(settings.jobs).length)
            console.warn('No watchers were defined in settings file')
    }
}
