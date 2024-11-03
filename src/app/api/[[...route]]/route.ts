
import { Redis } from '@upstash/redis/cloudflare'
import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/vercel";// Pour deploiement Vercel
import { env } from "hono/adapter";
export const runtime = "edge";// Pour deploiement CF

const app = new Hono().basePath("/api");

type EnvConfig ={
    // Ajouter les variables d'environnements ici
    UPSTASH_REDIS_REST_URL: string
    UPSTASH_REDIS_REST_TOKEN: string
}

app.use('/*',cors())
app.get("/search", async (c) => {
    try {
        
    const {UPSTASH_REDIS_REST_TOKEN,UPSTASH_REDIS_REST_URL} = env<EnvConfig>(c)

    const start = performance.now()
    const redis = new Redis({
        token: UPSTASH_REDIS_REST_TOKEN,
        url: UPSTASH_REDIS_REST_URL
    })

    const query = c.req.query("q")?.toUpperCase()
    if (!query) {
        return c.json({message:'missing query'},{status:400});
    }

    const res: string[] = []
    const rank = await redis.zrank("terms", query)
    if (rank !== null && rank !== undefined) {
        const temp = await redis.zrange<string[]>("terms", rank, rank+100)
        for(const el of temp){
            if(!el.startsWith(query)){
                break
            }
            if(el.endsWith('*')){
                res.push(el.substring(0,el.length-1))
            }
        }
    }

    const end = performance.now()
    return c.json(
        { duration: end - start, results: res }
    );
    } catch (error) {
        return c.json(
            { message: 'Something BAD happened'+error, results: [] },
            { status: 500 }
        );
    }
});


export const GET = handle(app) // Pour deploiement vercel
export default app as never// Pour deploiement Cloudflare