
import pool from "../db/db.js"
import bcrypt from "bcrypt";
import { AppError } from "../errors/AppError.js";
import jwt  from "jsonwebtoken";
import { string } from "zod";
import "dotenv/config"
import { AuthPayload } from "../types/auth.types.js";



export const registerUser = async(data: {
    name: string,
    email: string,
    password: string
}) => {

    const client = await pool.connect()
    try{
    await client.query("BEGIN");
    
    const passwordHash = await bcrypt.hash(data.password, 10)

    const registerUserResults = await client.query(
        `INSERT INTO users(name, email, password_hash)
        VALUES ($1, $2, $3) 
        RETURNING id, name, email`, 
        [data.name, data.email, passwordHash]
    )
    const registerUsers = registerUserResults.rows[0] 
    
    await client.query("COMMIT")

    return {
        registerUsers
    }
   }
   catch(error){
    await client.query("ROLLBACK")
    throw error
   }
   finally{
     client.release()
   }
}

export const loginUser = async(
    email: string,
    password: string
) => {

    const client = await pool.connect()

    try{
         await client.query("BEGIN");
         const forlogin = await client.query(
            `SELECT id, name, email,password_hash,role
             FROM users
             WHERE email = $1`, [email]
         )

         if(forlogin.rows.length === 0) {
            throw new AppError("User not found", 404)
         }
        const user = await forlogin.rows[0]
        const loginResult = await bcrypt.compare(password, user.password_hash)
        if(!loginResult) {
        throw new AppError("INVALID email or password", 400)
       } 
        const token = jwt.sign({
        id: user.id,
        role: user.role
        }, process.env.JWT_SECRET!,{
        expiresIn: "15m"
        })
        await client.query("COMMIT")

        return{
            token
        }
        
    }
    catch(error) {
     
        await client.query("ROLLBACK")
        throw error
    }
    finally{
        client.release()
    }

}