module.exports = async function(app){

    const logger = await (require('./../lib/logger')).global()

    app.get('/', async function(req, res){
        try {
            res.end(`
Freeagain service is running.\n
Use /failing to get a list of currently failing jobs.
Use /failed to get a list of any jobs which failed since last admin check-in.
Use /jobs to get a list of jobs.
Use /jobs/JOBNAME to get details on a specific job.\n`);

        } catch(ex) {
            res.status(500)
            res.end('Something went wrong - check logs for details.')
            logger.error(ex)
        }
    })
}