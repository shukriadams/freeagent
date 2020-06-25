(async ()=>{

    try{
        const 
            http = require('http'),
            Express = require('express'),
            path = require('path'),
            app = Express(),
            fs = require('fs-extra'),
            settings = require('./lib/settings'),
            daemon = require('./lib/daemon'),
            logger = require('./lib/logger'),
            routeFiles = fs.readdirSync(path.join(__dirname, 'routes'))

        await settings.validate()
        await fs.ensureDir(settings.logPath)

        // static content
        app.use(Express.static('./public'))

        // load routes
        for (const routeFile of routeFiles){
            const name = routeFile.match(/(.*).js/).pop(),
                routes = require(`./routes/${name}`)

            routes(app)
        }

        await logger.initializeJobs()
        await daemon.start()
        const server = http.createServer(app)
        server.listen(settings.port)

        console.log(`Listening on port ${settings.port}`)
    } catch(ex){
        console.log(ex)
    }

})()