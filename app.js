const { connectToDatabase } = require('./config/database');

async function startApp() {
    await connectToDatabase();
    const Server = require('./models/server');
    const server = new Server();
    server.start();
}

startApp().catch(console.error);