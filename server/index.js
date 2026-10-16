import express from 'express';import pg from 'pg';import {validateProject} from '../src/model.js';
const app=express(),pool=new pg.Pool({connectionString:process.env.DATABASE_URL});app.use(express.json({limit:'2mb'}));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
app.param('id',(req,res,next,id)=>uuid.test(id)?next():res.status(400).json({error:'Invalid project ID'}));
app.put('/api/projects/:id',async(req,res,next)=>{try{validateProject(req.body);await pool.query('INSERT INTO projects(id,document) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET document=$2,updated_at=now()',[req.params.id,req.body]);res.sendStatus(204);}catch(e){if(e.message==='Invalid clip'||e.message==='Unsupported project')res.status(400).json({error:e.message});else next(e);}});
app.get('/api/projects/:id',async(req,res,next)=>{try{const {rows}=await pool.query('SELECT document FROM projects WHERE id=$1',[req.params.id]);rows.length?res.json(rows[0].document):res.sendStatus(404);}catch(e){next(e);}});app.use((err,req,res,next)=>{console.error(err.message);res.status(500).json({error:'Project storage unavailable'});});app.listen(3001,'127.0.0.1');
