import express from "express";
import mysql from 'mysql';
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from "bcryptjs";
import dotenv from 'dotenv'
dotenv.config()

const app=express()

app.use(express.json())
app.use(cors())

const HOST= process.env.DB_HOST
const USER= process.env.DB_USER
const PASSWORD=process.env.DB_PASS
const DATABASE=process.env.DB_DATABASE
const BASE_URL=process.env.BASE_URL
const PORT=process.env.PORT || 8800
const USERS_URL=process.env.USERS_URL

const db= mysql.createConnection({
    host:`${HOST}`,
    user:`${USER}`,
    password:`${PASSWORD}`,
    database:`${DATABASE}`
})

app.get(`${USERS_URL}`,(req,res)=>{
    const q='select * from userinfo'
    db.query(q,(err,data)=>{
        if (err) return res.json(err)
        return res.json(data)
    })
})

app.get(`/products`,(req,res)=>{
    const{sort_by}=req.query
    let q=''
    if(sort_by==='PRICE_LOW'){
        q=`SELECT * FROM products ORDER BY price ASC`
    }
    else{
        q=`SELECT * FROM products ORDER BY price DESC`
    }

    let jwtToken;
    const authHeader = req.headers["authorization"];
    if (authHeader !== undefined) {
        jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined) {
        res.status(401);
        res.send("Invalid Access Token");
    } else {
        jwt.verify(jwtToken, process.env.SECRET_KEY, async (error, payload) => {
        if (error) {
            res.send("Invalid Access Token");
        } else {
            db.query(q,(err,data)=>{
                if (err) return res.json(err)
                return res.json(data)
            })
        }
        })
        }
        
})

app.post(`/login`, async (req, res) => {
    const selectUserQuery = `SELECT * FROM userinfo WHERE email='${req.body.email}'`;
    const password=req.body.password
    db.query(selectUserQuery, async function (error, results, fields){
        if (error){
            res.send(error)
        } 
        else{
            if(results.length >0){         
                const comparison = await bcrypt.compare(password, results[0].password)
                if(comparison){              
                    const payload = {
                        email: req.body.email,
                      };
                      const jwtToken = jwt.sign(payload, process.env.SECRET_KEY);
                      res.send({jwtToken})
                    }else{            
                    res.send({                 
                    "code":204,                 
                    "error":"*Email and password does not match"            
                    })          
                    }        
                }else{          
                    res.send({            
                    "code":206,            
                    "error":"*Email does not exist"              
                    });        
                    }    
                }  
    })
    
  });

app.post(`${USERS_URL}`,async  (req,res)=>{
    const q='INSERT INTO userinfo (`name`,`email`,`password`) VALUES(?)'
    const password = req.body.password;
    const hashPassword= await bcrypt.hash(password, 10)
    const values=[req.body.name,req.body.email,hashPassword]
    db.query(q, [values], (err, data) => {
        if (err)
            return res.json(err);
        return res.json('user created....');
    })
})


app.listen(PORT,function(){
    console.log('running.......')
})