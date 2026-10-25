const express = require('express');
const models = require('./models');
const security = require('./security');
const { getPlan } = require('./plans');
const db = require('./db');
const router = express.Router();
function requireAdmin(req,res,next){const token=req.cookies&&req.cookies.kf_session;const p=token&&security.verifySession(token);const user=p&&models.getUserById(p.uid);if(!user)return res.status(401).json({error:'Unauthorized'});if(!user.is_admin)return res.status(403).json({error:'Forbidden'});req.user=user;next();}
function csrf(req,res,next){if(['GET','HEAD','OPTIONS'].includes(req.method))return next();const h=req.headers['x-csrf-token'];const c=req.cookies&&req.cookies.kf_csrf;if(!h||!c||h!==c)return res.status(403).json({error:'CSRF token mismatch'});next();}
router.use(requireAdmin);router.use(csrf);
router.get('/stats',(req,res)=>res.json(models.adminStats()));router.get('/users',(req,res)=>res.json({users:models.listUsers()}));router.get('/payments',(req,res)=>res.json({payments:models.listPayments()}));
router.post('/users/:id/plan',(req,res)=>{const id=Number.parseInt(req.params.id,10);if(req.body.planId==='free')db.prepare("UPDATE users SET plan='free',plan_expires_at=0 WHERE id=?").run(id);else if(getPlan(req.body.planId))models.grantPlan(id,req.body.planId);else return res.status(400).json({error:'Invalid plan'});res.json({ok:true});});
router.delete('/users/:id',(req,res)=>res.json({ok:models.deleteUser(Number.parseInt(req.params.id,10))}));
module.exports=router;
