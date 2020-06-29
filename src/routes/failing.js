module.exports = async function(app){
    const 
        path = require('path'),
        fs = require('fs-extra'),
        sh = require('madscience-node-exec').sh,
        jsonfile = require('jsonfile'),
        settings = require('./../lib/settings'),
        logger = await (require('./../lib/logger')).global()


    /**
     * Returns object jobs currently failing; 
     * Object structure 
     * 
     * jobname : {
     *     reason : string. can be 'never run', 'failed' or 'stalled'
     * }
     * 
     * object is empty if all jobs are passing.
     */
    app.get('/failing', async function(req, res){
        try {

            const failed = {},
                now = new Date()

            for (const jobName in settings.jobs){

                const job = settings.jobs[jobName]

                const queueQuery = (await sh({ cmd : 'ls -A1 -t', cwd: path.join(settings.logPath, job.__safeName, 'queue') })).result,
                    files = queueQuery
                        .split('\n')            // one file per line
                        .filter(file => !!file) // remove empty entries
        
                if (!files.length){
                    failed[jobName] = { reason : 'never run' }
                    continue
                }

                const statusPath = files[0]
                console.log('>>>', statusPath)

                // has job passed?
                const queueFile = jsonfile.readFileSync(path.join(settings.logPath, job.__safeName, 'queue', statusPath))
                if (!queueFile.passed){
                    failed[jobName] = { reason : 'failed' }
                    continue
                }

                // has job run as expected
                /*
                if (queueFile.next < now){
                    failed[jobName] = { reason : 'stalled' }
                    continue
                }
                */
            }

            return res.json(failed)

        } catch(ex) {
            res.status(500)
            res.end('Something went wrong - check logs for details.')
            logger.error(ex)
        }
    })
}