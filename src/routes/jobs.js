module.exports = async function(app){

    const 
        path = require('path'),
        fs = require('fs-extra'),
        jsonfile = require('jsonfile'),
        settings = require('./../lib/settings'),
        logger = await (require('./../lib/logger')).global()


    /**
     * Returns a string array for all jobs
     */
    app.get('/jobs', async function(req, res){
        try {

            return res.json(Object.keys(settings.jobs))

        } catch(ex) {
            res.status(500)
            res.end('Something went wrong - check logs for details.')
            Logger.error(ex)
        }
    })


    /**
     * Gets status.json for a specific job. This reveals the job's status, when it was
     * last run, and when it will next run.
     */
    app.get('/jobs/:jobName', async function(req, res){
        try {
            const job = settings.jobs[req.params.jobName]

            if (!job) {
                res.statusCode = 404
                return res.end(`job ${jobName} not found.\n`)
            }
            
            let statusPath = path.join(settings.logPath, job.__safeName, 'status.json');

            // force job check against settings object to prevent route injection attack
            if (!await fs.exists(statusPath)){
                res.statusCode = 404
                return res.end(`status.json not found for job ${jobName}. check logs\n`)
            }

            let status = jsonfile.readFileSync(statusPath)
            res.json(status)

        } catch(ex) {
            res.status(500)
            res.end('Something went wrong - check logs for details.')
            logger.error(ex)
        }
    })
}