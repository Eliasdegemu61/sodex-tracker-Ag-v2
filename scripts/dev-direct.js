const { startServer } = require("next/dist/server/lib/start-server")

async function main() {
  const port = Number(process.env.PORT || 3000)
  const hostname = process.env.HOSTNAME || "127.0.0.1"

  await startServer({
    dir: process.cwd(),
    port,
    allowRetry: true,
    isDev: true,
    hostname,
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
