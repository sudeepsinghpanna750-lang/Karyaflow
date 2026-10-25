const express = require('express');
const { body, validationResult } = require('express-validator');
const models = require('./models');
const security = require('./security');
const { runWorkflow } = require('./ai');
const router = express.Router();
function requireAuth(req,res,next){const t=req.cookies&&req.cookies.kf_session;const p=t&&security.verifySession(t);const u=p&&models.getUserById(p.uid);if(!u)return res.status(401).json({error:'Unauthorized'});req.user=u;next();}
function csrf(req,res,next){if(['GET','HEAD','OPTIONS'].includes(req.method))return next();const h=req.headers['x-csrf-token'];const c=req.cookies&&req.cookies.kf_csrf;if(!h||!c||h!==c)return res.status(403).json({error:'CSRF token mismatch'});next();}
router.use(requireAuth);router.use(csrf);router.get('/',(req,res)=>res.json({workflows:models.listWorkflows(req.user.id,{limit:100,offset:0}),access:models.getAccess(req.user)}));
router.post('/',[body('name').isLength({min:1,max:120}),body('config').optional().isObject()],(req,res)=>{if(!validationResult(req).isEmpty())return res.status(400).json({error:'Invalid input.'});const access=models.getAccess(req.user);if(!access.canCreate)return res.status(402).json({error:'Workflow limit reached.',access});const id=models.createWorkflow(req.user.id,String(req.body.name).trim(),String(req.body.description||'').slice(0,2000),req.body.config||{});res.json({ok:true,id,access:models.getAccess(req.user)});});
router.get('/:id',(req,res)=>{const wf=models.getWorkflow(req.user.id,Number.parseInt(req.params.id,10));if(!wf)return res.status(404).json({error:'Workflow not found.'});res.json({workflow:wf});});
router.put('/:id',(req,res)=>{const id=Number.parseInt(req.params.id,10);const current=models.getWorkflow(req.user.id,id);if(!current)return res.status(404).json({error:'Workflow not found.'});const wf=models.updateWorkflow(req.user.id,id,{name:req.body.name===undefined?current.name:String(req.body.name).trim(),description:String(req.body.description||current.description||'').slice(0,2000),config:req.body.config===undefined?current.config:req.body.config});res.json({ok:true,workflow:wf});});
router.delete('/:id',(req,res)=>{const ok=models.deleteWorkflow(req.user.id,Number.parseInt(req.params.id,10));if(!ok)return res.status(404).json({error:'Workflow not found.'});res.json({ok:true,access:models.getAccess(req.user)});});
router.post('/:id/run',async(req,res)=>{const wf=models.getWorkflow(req.user.id,Number.parseInt(req.params.id,10));if(!wf)return res.status(404).json({error:'Workflow not found.'});try{res.json(await runWorkflow(wf,req.user));}catch(e){res.status(500).json({ok:false,error:'Workflow run failed.'});}});module.exports=router;
