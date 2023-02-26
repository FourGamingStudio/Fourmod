

function deepCopy(obj) {
	var clone = {};
	for (var i in obj) {
		if (Array.isArray(obj[i])) {
			clone[i] = [];
			for (var z in obj[i]) {
				if (typeof(obj[i][z]) == "object" && obj[i][z] != null) {
					clone[i][z] = deepCopy(obj[i][z]);
				} else {
					clone[i][z] = obj[i][z];
				}
			}
		} else if (typeof(obj[i]) == "object" && obj[i] != null)
			clone[i] = deepCopy(obj[i]);
		else
			clone[i] = obj[i];
	}
	return clone;
}

function replaceAtlas(name,region){
	if(!region){
		return;
	}
 	var editoricon2 = Core.atlas.find(name);
	if(!editoricon2){
		return;
	}
 	editoricon2.u=region.u;
 	editoricon2.v=region.v;
 	editoricon2.u2=region.u2;
 	editoricon2.v2=region.v2;
 	editoricon2.texture = region.texture;
}
function changeAtlas(name){
	var editoricon2 = Core.atlas.find("block-"+name + "-medium");
	var newicon = Core.atlas.find("xelos-pixel-texturepack-"+name+"-icon");
	editoricon2.set(newicon.u, newicon.v, newicon.u2, newicon.v2);
	editoricon2.texture = newicon.texture;
}
function changeAtlasToSprite(type,name,region){
	replaceAtlas(type+"-"+name + "-full",region);
	replaceAtlas(type+"-"+name + "-ui",region);
}

function directAtlasReplace(region, replacement){
	if(replacement.name=="error" || !replacement || !region){
		return;
	}
	region.texture.getTextureData().pixmap.draw(replacement.texture.getTextureData().pixmap, 
					region.u * region.texture.width, 
					region.v * region.texture.height, 
					replacement.u*replacement.texture.width, replacement.v*replacement.texture.height, replacement.width, replacement.height);
}
function smoothCurve(x){
	return x*x*(3-2*x);
	
}



function drawOrientedRect(tex,x,y,ox,oy,rotdeg,rot){
	Draw.rect(tex,x + Mathf.cosDeg(rotdeg-90)*ox + Mathf.sinDeg(rotdeg-90)*oy,y + Mathf.sinDeg(rotdeg-90)*ox - Mathf.cosDeg(rotdeg-90)*oy,rot+rotdeg);
}

function drawOrientedLine(tex,x,y,ox,oy,ox2,oy2,rotdeg){
	let c = Mathf.cosDeg(rotdeg-90);
	let s = Mathf.sinDeg(rotdeg-90);
	Lines.line(tex,   x + c*ox + s*oy,y + s*ox - c*oy,   x + c*ox2 + s*oy2,y + s*ox2 - c*oy2,   false);
}
function createOrientedEffect(eff,x,y,ox,oy,rotdeg,rot){
	eff.at(x + Mathf.cosDeg(rotdeg-90)*ox + Mathf.sinDeg(rotdeg-90)*oy,y + Mathf.sinDeg(rotdeg-90)*ox - Mathf.cosDeg(rotdeg-90)*oy,rot);
}



const type_point_welder = 0;
const type_line_welder = 1;
const type_large_welder = 2;
const mechArm = {
	fromX:0,
	fromY:0,
	toX:0,
	toY:0,
	positions:[],
	actions:[],
	rotation: 0,
	tx: 0,//headpos
	ty: 0,
	nx: 0,//normal
	ny: 0,
	lastEffect: 0,lastEffect2: 0,
	type: type_point_welder,
	restx: 0,resty: 0,
	draw(bx,by,progress,rotdeg,spd){
		this.lastEffect -= Time.delta;
		this.lastEffect2 -= Time.delta;
		if(this.positions.length>0 && progress < 1 && spd > 0.001){
			for(let i = 0;i<this.positions.length;i++){
				if(i+1 == this.positions.length || this.positions[i+1].t>progress){
					switch(this.type){
						case type_point_welder:
							let dtx = (this.positions[i].x-this.tx);
							let dty = (this.positions[i].y-this.ty);
							this.tx += dtx*0.1*spd;
							this.ty += dty*0.1*spd;
							if(Math.abs(dtx)+Math.abs(dty)<1 && this.lastEffect<0 && this.positions[i].a){
								createOrientedEffect(weldspark,bx,by,this.tx*Draw.scl,this.ty*Draw.scl,rotdeg,45+Mathf.range(7) +i*839);
								this.lastEffect = 5;
							}
							break;
						case type_line_welder:
							let next = this.positions[Math.min(i+1,this.positions.length-1)];
							let curr = this.positions[i];
							let l = (progress - curr.t) / (next.t - curr.t);
							if(next==curr){
								l = 0;
							}
							l = smoothCurve(l);
							this.tx = Mathf.lerp(curr.x,next.x,l);
							this.ty = Mathf.lerp(curr.y,next.y,l);
							if(curr.a){
								if(this.lastEffect<0){
									createOrientedEffect(weldspark,bx,by,this.tx*Draw.scl,this.ty*Draw.scl,rotdeg,45+Mathf.range(7)+i*4);
									this.lastEffect = 5;
								}
								if(this.lastEffect2<0){
									createOrientedEffect(weldglow,bx,by,this.tx*Draw.scl,this.ty*Draw.scl,rotdeg,0);
									this.lastEffect2 = 1.5;
								}
							}
							break;
					}
					break;
				}
			}
		}else{
			this.tx += (this.restx -this.tx)*0.1;
			this.ty += (this.resty -this.ty)*0.1;
		}
		this.drawArm(bx,by,rotdeg,progress);
	},
	
	drawArm(bx,by,rotdeg,progress){
		let dx = this.toX-this.fromX; let dy = this.toY - this.fromY;
		let slidepos = ((this.tx-this.fromX)*dx + (this.ty-this.fromY)*dy)/(dx*dx+dy*dy);
		
		let x = Mathf.lerp(this.fromX,this.toX,slidepos);
		let y = Mathf.lerp(this.fromY,this.toY,slidepos);
		let dis = Mathf.dst(x,y,this.tx,this.ty);
		for(let i = 0;i<dis-16;i+=32){
			drawOrientedRect(armconn,bx,by,(this.tx-this.nx*(i+16))*Draw.scl,(this.ty-this.ny*(i+16))*Draw.scl,rotdeg,this.rotation);
		}
		drawOrientedRect(armhead,bx,by,this.tx*Draw.scl,this.ty*Draw.scl,rotdeg,this.rotation);//
		drawOrientedRect(armbase,bx,by,x*Draw.scl,y*Draw.scl,rotdeg,this.rotation);//
	},
	
	repeatPosition(rest, t){
		if(this.positions.length==0){
			return;
		}
		let copy = Object.create(this.positions[this.positions.length-1]);
		copy.a = rest;
		copy.t = t;
		this.positions.push(copy);
	},
	
	resetRail(x,y,x2,y2){
		this.fromX = x;
		this.toX = x2;
		this.fromY = y;
		this.toY = y2;
		this.rotation = 270-Angles.angle(x,y,x2,y2);
		let d = Mathf.dst(x,y,x2,y2);
		this.nx = (y-y2)/d;
		this.ny = -(x-x2)/d;
		this.restx = (this.fromX + this.nx*8);
		this.resty = (this.fromY + this.ny*8);
	},
	//oriented from a building facing down
	newArm(x,y,x2,y2){
		let arm = Object.create(this);
		arm.resetRail(x,y,x2,y2);
		return arm;
	}
}

const pivotingMechArm = Object.assign(deepCopy(mechArm),{
	seglength:40,
	pox:0,poy:0,
	drawArm(bx,by,rotdeg,progress){
		let dx = this.toX-this.fromX; let dy = this.toY - this.fromY;
		let slidepos = ((this.tx-this.fromX)*dx + (this.ty-this.fromY)*dy)/(dx*dx+dy*dy);
		slidepos = Mathf.clamp(slidepos,0,1);
		let x = Mathf.lerp(this.fromX,this.toX,slidepos);
		let y = Mathf.lerp(this.fromY,this.toY,slidepos);
		let tdx = this.tx-x;
		let tdy = this.ty-y;
		let tdd = Mathf.dst(0,0,tdx,tdy);
		let itdd = 1.0/tdd;
		let o = Mathf.sqrt(this.seglength*this.seglength - tdd*tdd*0.25)
		if(o<0 || isNaN(o)){
			o = 0;
		}
		let otx = o*(tdy*itdd);
		let oty = o*(tdx*itdd);
		if(Math.abs(x + tdx*0.5 + otx - this.pox)+Math.abs(y + tdy*0.5 - oty - this.poy) > 
		   Math.abs(x + tdx*0.5 - otx - this.pox)+Math.abs(y + tdy*0.5 + oty - this.poy)){
			o*=-1;
		}
		
		let ox = x + tdx*0.5 + o*(tdy*itdd);
		let oy = y + tdy*0.5 - o*(tdx*itdd);
		
		this.drawArmActual(x,y,bx,by,ox,oy,rotdeg,progress);
		
		this.pox=ox;
		this.poy=oy;
		if(progress==1){
			this.pox = 0;
			this.poy = 0;
		}
	},
	
	drawArmActual(x,y,bx,by,ox,oy,rotdeg,progress){
		Lines.stroke(8);
		drawOrientedLine(armconntickside, bx,by, ox*Draw.scl, oy*Draw.scl, x*Draw.scl, y*Draw.scl,rotdeg);
		drawOrientedLine(armconnside, bx,by, ox*Draw.scl, oy*Draw.scl, this.tx*Draw.scl, this.ty*Draw.scl,rotdeg);
		
		drawOrientedRect(armconnjoint,bx,by,ox*Draw.scl,oy*Draw.scl,rotdeg,this.rotation);//
		
		drawOrientedRect(armbase,bx,by,x*Draw.scl,y*Draw.scl,rotdeg,this.rotation);//
		drawOrientedRect(armhead,bx,by,this.tx*Draw.scl,this.ty*Draw.scl,rotdeg,this.rotation);//
	}
});

const pivotingMechArmLarge = Object.assign(deepCopy(pivotingMechArm),{
	drawArmActual(x,y,bx,by,ox,oy,rotdeg,progress){
		Lines.stroke(8);
		drawOrientedLine(armconntickside, bx,by, ox*Draw.scl, oy*Draw.scl, x*Draw.scl, y*Draw.scl,rotdeg);
		drawOrientedLine(armconntickside, bx,by, ox*Draw.scl, oy*Draw.scl, this.tx*Draw.scl, this.ty*Draw.scl,rotdeg);
		
		drawOrientedRect(armconnjoint,bx,by,ox*Draw.scl,oy*Draw.scl,rotdeg,this.rotation);//
		
		drawOrientedRect(armbase,bx,by,x*Draw.scl,y*Draw.scl,rotdeg,this.rotation);//
		drawOrientedRect(armheadlarge,bx,by,this.tx*Draw.scl,this.ty*Draw.scl,rotdeg,this.rotation);//
	}
})
var armbase=null;
var armhead=null;
var armheadlarge=null;
var armconn=null;
var armconnside=null;
var armconntickside=null;
var armconnjoint=null;
var expoplatform = null;
var weldspark = null;
var weldglow = null;

const unitFacB = {
	arms: [],
	pieces: [],
	gw:0,gh:0,cw:0,ch:0,usprite:null,
	gsize: 24,
	getUnitSprite(){
		if(this.currentPlan != -1){
			return this.block.plans.get(this.currentPlan).unit.fullIcon;
		}
		return Core.atlas.find("error");
	},
	isWorking(){
		return this.currentPlan != -1;
	},
	getProgress(){
		if(this.currentPlan != -1){
			return Math.min(1,this.progress / this.block.plans.get(this.currentPlan).time);
		}
		return 1;
	},
	drawBelow(){
		
	},
	drawOntop(){
		
	},
	draw(){	
		if(this.arms.length == 0){
			this.setupArms();
		}
		let x = this.x;
		let y = this.y;
		let rotdeg = this.rotdeg();
		Draw.rect(this.block.region, x, y);
		Draw.rect(this.block.outRegion, x, y, this.rotdeg());
		let pratio = this.getProgress();
		this.drawBelow();
		this.drawPayload();
		if(this.isWorking()){
			let unitSprite = this.getUnitSprite();
			if(this.pieces.length==0 || this.usprite!=unitSprite){
				this.pieces=[];
				this.gw = Math.max(1,Mathf.floor(unitSprite.width/this.gsize));
				this.gh = Math.max(1,Mathf.floor(unitSprite.height/this.gsize));
				this.cw = unitSprite.width/this.gw;
				this.ch = unitSprite.height/this.gh;
				this.usprite=unitSprite;
				this.makePieces(unitSprite);
				this.resetArms();
				this.assignPaths();
			}
			this.windup += (1.0-this.windup)*0.08;
			let rx = 0;
			let ry = 0;
			let ax = 0;
			let ay = 0;
			
			let showam = Mathf.clamp(Mathf.ceil(this.pieces.length*pratio),0,this.pieces.length);
			for (let i = 0;i<showam;i++){
				rx = this.pieces[i].x;
				ry = this.pieces[i].y;
				ax = Mathf.cosDeg(rotdeg-90)*rx + Mathf.sinDeg(rotdeg-90)*ry; 
				ay = Mathf.sinDeg(rotdeg-90)*rx - Mathf.cosDeg(rotdeg-90)*ry; 
				let size = (pratio-this.pieces[i].tstart)/(this.pieces[i].tend - this.pieces[i].tstart);
				size = Mathf.clamp(size,0,1);
				if(size>0){
					Draw.rect(this.pieces[i].tex, x+ax, y+ay, this.cw*Draw.scl*size, this.ch*Draw.scl*size, rotdeg - 90.0);
				}
			}
		}else{
			this.pieces=[];
			this.usprite = null;
		}

		Draw.z(Layer.blockOver);

		this.payRotation = rotdeg;
		

		Draw.z(Layer.blockOver + 0.1);
		Draw.rect(this.block.topRegion, x, y,rotdeg);
		this.drawOntop();
		this.drawArms(x,y,pratio,rotdeg);
		
		
	},
	
	makePieces(unitSprite){
		let ox = (-this.usprite.width*0.5 + this.cw*0.5)*Draw.scl;
		let oy = (-this.usprite.height*0.5 + this.ch*0.5)*Draw.scl;
		let count = 0.0;
		let total = this.gh*this.gw;
		for (let j = 0;j<this.gh;j++){
			for (let i = 0;i<this.gw;i++){
				let lx = Mathf.floor(i*this.cw);
				let lx2 = Mathf.floor((i+1)*this.cw);
				this.pieces.push({
					tex: new TextureRegion(unitSprite, lx, j*this.ch,lx2-lx,this.ch),
					x: (lx)*Draw.scl + ox,
					y: (this.ch * j)*Draw.scl + oy,
					w: lx2-lx,
					h: this.ch,
					tstart: count/total,
					tend: (count+1)/total,
				});
				count ++;
			}	
		}
	},
	
	drawArms(x,y,pratio,rotdeg){
		for(let i=0;i<this.arms.length;i++){
			this.arms[i].draw(x,y,pratio,rotdeg,this.speedScl*(this.payload==null?1:0))
		}
	},
	
	setupArms(){
		this.arms.push(mechArm.newArm(-32,16, -32,-16));
		this.arms.push(mechArm.newArm(32,-16, 32,16));
		this.arms[1].type = type_line_welder;
	},
	
	resetArms(){
		for (let i = 0;i<this.arms.length;i++){
			this.arms[i].positions = [];
		}
	},
	assignArmTask(type,tasks){
		switch(type){
			case type_point_welder:
				this.arms[0].positions = this.arms[0].positions.concat(tasks);
			break;
			case type_line_welder:
				this.arms[1].positions = this.arms[1].positions.concat(tasks);
			break;
		}
	},
	squarePath(x,y,x2,y2,tstart,tend){
		return [
			{x: x, y: y, t: tstart, a: true },
			{x: x2,y: y, t: Mathf.lerp(tstart,tend,0.2), a: true },
			{x: x2,y: y2,t: Mathf.lerp(tstart,tend,0.4), a: true },
			{x: x ,y: y2,t: Mathf.lerp(tstart,tend,0.6), a: true },
			{x: x ,y: y ,t: tend, a: false },
		];
	},
	assignPaths(){
		let dt = 1.0/(this.pieces.length*1.0);
		for (let i = 0;i<this.pieces.length;i++){
			let ax = this.pieces[i].x/Draw.scl;
			let ay = this.pieces[i].y/Draw.scl;
			let piece = this.pieces[i];
			this.assignArmTask(type_point_welder,[{
				x: ax,
				y: ay,
				t: piece.tstart,
				a: true,
			}]);
			this.assignArmTask(type_large_welder,[
				{x: ax-piece.w*0.25,y: ay-piece.h*0.25,t: Mathf.lerp(piece.tstart,piece.tend,0.25),a: true},
				{x: ax+piece.w*0.25,y: ay-piece.h*0.25,t: Mathf.lerp(piece.tstart,piece.tend,0.45),a: true},
				{x: ax+piece.w*0.25,y: ay+piece.h*0.25,t: Mathf.lerp(piece.tstart,piece.tend,0.65),a: true},
				{x: ax-piece.w*0.25,y: ay+piece.h*0.25,t: Mathf.lerp(piece.tstart,piece.tend,0.85),a: true},
			]);
			this.assignArmTask(type_line_welder,
				this.squarePath( ax-piece.w*0.5, ay-piece.h*0.5, ax+piece.w*0.5, ay+piece.h*0.5,   Mathf.lerp(piece.tstart,piece.tend,0.6),   Mathf.lerp(piece.tstart,piece.tend,0.9))
			);
		}
		for (let i = 0;i<this.arms.length;i++){
			if(this.arms[i].positions.length == 0 || this.arms[i].positions[0].t>0){
				
				this.arms[i].positions = [{
					x: this.arms[i].restx,
					y: this.arms[i].resty,
					t: 0,
					a: false,
				}].concat(this.arms[i].positions);
			}
		}
	}
}

const reconFacB = Object.assign(deepCopy(unitFacB),{
	getUnitSprite(){
		if(this.isWorking()){
			return this.upgrade(this.payload.unit.type).fullIcon;
		}
		return Core.atlas.find("error");
	},
	isWorking(){
		return this.constructing() && this.hasArrived();
	},
	getProgress(){
		if(this.isWorking()){
			return this.progress / this.block.constructTime;
		}
		return 1;
	},
	drawBelow(){
		let fallback = true;
		for(let i = 0; i < 4; i++){
			if(this.blends(i) && i != this.rotation){
				Draw.rect(this.block.inRegion, this.x, this.y, (i * 90) - 180);
				fallback = false;
			}
		}
		if(fallback){ 
			Draw.rect(this.block.inRegion, this.x, this.y, this.rotation * 90);
		}
		if(this.isWorking()){
			Draw.rect(this.payload.unit.type.fullIcon, this.x, this.y, this.payload.rotation() - 90);
		}
	},
	assignArmTask(type,tasks){
		Log.info(type+","+tasks);
		switch(type){
			case type_point_welder:
				this.arms[0].positions = this.arms[0].positions.concat(tasks);
			break;
			case type_line_welder:
				this.arms[1].positions = this.arms[1].positions.concat(tasks);
			break;
		}
	},
	setupArms(){
		this.arms.push(pivotingMechArm.newArm(-40,-32, -39,-32));
		this.arms.push(pivotingMechArm.newArm(40,32, 39,32));
		this.arms[1].type = type_line_welder;
		this.arms[0].seglength = 54;
		this.arms[1].seglength = 54;
	},
	drawArms(x,y,pratio,rotdeg){
		for(let i=0;i<this.arms.length;i++){
			this.arms[i].draw(x,y,pratio,rotdeg,this.speedScl);
		}
	},
	
});


Events.on(EventType.ClientLoadEvent, 
cons(e => {
	Log.info("Client load")
	armbase = Core.atlas.find("xelos-pixel-texturepack-construct-arm-base");
	armhead = Core.atlas.find("xelos-pixel-texturepack-construct-arm-head");
	armheadlarge = Core.atlas.find("xelos-pixel-texturepack-construct-arm-head-large");
	armconn = Core.atlas.find("xelos-pixel-texturepack-construct-arm-connector");
	armconnside = Core.atlas.find("xelos-pixel-texturepack-construct-arm-connector-side");
	armconntickside = Core.atlas.find("xelos-pixel-texturepack-construct-arm-connector-thick-side");
	armconnjoint = Core.atlas.find("xelos-pixel-texturepack-construct-arm-connector-joint");
	expoplatform = Core.atlas.find("xelos-pixel-texturepack-construct-platform");
	weldspark = new Effect(12, cons(e=>{
		Draw.color(Color.white, Pal.turretHeat, e.fin());
        Lines.stroke(e.fout() * 0.6 + 0.6);

        Angles.randLenVectors(e.id, 3, 15 * e.finpow(), e.rotation, 3, new Floatc2(){get: (x, y) => {
            Lines.lineAngle(e.x + x, e.y + y, Mathf.angle(x, y), e.fslope() * 5 + 0.5);
        }});
	}));
	weldglow = new Effect(20, cons(e=>{
		Draw.color(Color.white, Pal.turretHeat, e.fin());
        Fill.square(e.x,e.y,e.fout() * 0.6 + 0.6);
	}));
	
	Vars.content.getBy(ContentType.block).each(block=>{
		/*
		if(!(block instanceof BaseTurret) &&
		    !(block instanceof Conveyor) &&
			!(block instanceof PayloadConveyor) &&
			!(block instanceof LiquidBlock) &&
			!(block instanceof UnitFactory) &&
			!(block instanceof Reconstructor) &&
			!(block instanceof RepairTurret) &&
			!(block instanceof MassDriver) &&
			!(block instanceof Floor) &&
			!(block instanceof Drill)){
			changeAtlasToSprite("block",block.name,Core.atlas.find(block.name));
		}*/
		
		if(block instanceof Floor){
			if(block.variants>0){
				if(block.variantRegions){
					for(let i = 0;i<block.variants;i++){
						directAtlasReplace(block.variantRegions[i], Core.atlas.find("xelos-pixel-texturepack-"+block.name+(i+1)));
					}
				}
			}else{
				directAtlasReplace(block.variantRegions[0], Core.atlas.find("xelos-pixel-texturepack-"+block.name));
			}
			directAtlasReplace(Core.atlas.find(block.name+"-edge"), Core.atlas.find("xelos-pixel-texturepack-"+block.name + "-edge"));
		}
		
		if(block instanceof Prop){
			if(block.variants>0){
				if(block.variantRegions){
					for(let i = 0;i<block.variants;i++){
						directAtlasReplace(block.variantRegions[i], Core.atlas.find("xelos-pixel-texturepack-"+block.name+(i+1)));
					}
				}
			}else{
				directAtlasReplace(block.region, Core.atlas.find("xelos-pixel-texturepack-"+block.name));
			}
			if(block instanceof StaticWall){
				directAtlasReplace(block.large, Core.atlas.find("xelos-pixel-texturepack-"+block.name+"-large"));
			}
		}
	});
	
	Vars.content.getBy(ContentType.unit).each(unit=>{
		changeAtlasToSprite("unit",unit.name + "-outline",Core.atlas.find("unit-"+unit.name + "-outline"));
		unit.loadIcon();
		changeAtlasToSprite("unit",unit.name,unit.fullIcon);
	});
	
	
	Blocks.airFactory.buildType = ()=>{
		return extend(UnitFactory.UnitFactoryBuild, Blocks.airFactory,deepCopy(unitFacB));
	}
	Blocks.groundFactory.buildType = ()=>{
		return extend(UnitFactory.UnitFactoryBuild, Blocks.groundFactory,deepCopy(unitFacB));
	}
	Blocks.navalFactory.buildType = ()=>{
		return extend(UnitFactory.UnitFactoryBuild, Blocks.navalFactory,deepCopy(unitFacB));
	}
	
	Blocks.additiveReconstructor.buildType = ()=>{
		return extend(Reconstructor.ReconstructorBuild, Blocks.additiveReconstructor,deepCopy(reconFacB));
	}
	
	Blocks.multiplicativeReconstructor.buildType = ()=>{
		return extend(Reconstructor.ReconstructorBuild, Blocks.multiplicativeReconstructor,Object.assign(deepCopy(reconFacB),{
			assignArmTask(type,tasks){
				switch(type){
					case type_point_welder:
						if(tasks[0].x<=0){
							this.arms[0].positions = this.arms[0].positions.concat(tasks);
							this.arms[3].repeatPosition(false,tasks[0].t);
						}else{
							this.arms[3].positions = this.arms[3].positions.concat(tasks);
							this.arms[0].repeatPosition(false,tasks[0].t);
						}
					break;
					case type_line_welder:
						if(tasks[0].x<=0){
							this.arms[1].positions = this.arms[1].positions.concat(tasks);
						}else{
							this.arms[2].positions = this.arms[2].positions.concat(tasks);
						}
					break;
				}
			},
			setupArms(){
				this.arms.push(pivotingMechArm.newArm(-51,-22, -22,-51));
				this.arms.push(pivotingMechArm.newArm(-22,51,-51,22,));
				this.arms.push(pivotingMechArm.newArm( 22,-51,51,-22));
				this.arms.push(pivotingMechArm.newArm( 51,22,22,51));
				this.arms[1].type = type_line_welder;
				this.arms[2].type = type_line_welder;
				this.arms[0].seglength = 40;
				this.arms[1].seglength = 40;
				this.arms[2].seglength = 40;
				this.arms[3].seglength = 40;
			},
			makePieces(unitSprite){
				let ox = (-this.usprite.width*0.5 + this.cw*0.5)*Draw.scl;
				let oy = (-this.usprite.height*0.5 + this.ch*0.5)*Draw.scl;
				let count = 0.0;
				let total = this.gh*this.gw;
				let tempList = [];
				for (let j = 0;j<this.gh;j++){
					for (let i = 0;i<this.gw;i++){
						tempList.push({
							tex: new TextureRegion(unitSprite, i*this.cw, j*this.ch,this.cw,this.ch),
							x: (this.cw * i)*Draw.scl + ox,
							y: (this.ch * j)*Draw.scl + oy,
							w: this.cw,
							h: this.ch,
							tstart: count/total,
							tend: (count+1)/total,
						});
						count ++;
					}	
				}
				tempList.sort((f, s) => { 
					return (Math.abs(f.x)+Math.abs(f.y))-(Math.abs(s.x)+Math.abs(s.y));
				});
				for (let i = 0;i<tempList.length;i++){
					tempList[i].tstart = i/total;
					tempList[i].tend = (i+1)/total;
					this.pieces.push(tempList[i]);
				}
			},
		}));
	}
	
	Blocks.exponentialReconstructor.buildType = ()=>{
		return extend(Reconstructor.ReconstructorBuild, Blocks.exponentialReconstructor,Object.assign(deepCopy(reconFacB),{
			gsize:48,
			platformy: 0,
			assignArmTask(type,tasks){
				switch(type){
					case type_point_welder:
						if(tasks[0].x<=0){
							this.arms[0].positions = this.arms[0].positions.concat(tasks);
							this.arms[3].repeatPosition(false,tasks[0].t);
						}else{
							this.arms[3].positions = this.arms[3].positions.concat(tasks);
							this.arms[0].repeatPosition(false,tasks[0].t);
						}
						
					break;
					case type_line_welder:
						if(tasks[0].x<=0){
							this.arms[1].positions = this.arms[1].positions.concat(tasks);
						}else{
							this.arms[2].positions = this.arms[2].positions.concat(tasks);
						}
					break;
					case type_large_welder:
						this.arms[4].positions = this.arms[4].positions.concat(tasks);
					break;
				}
			},	
			setupArms(){
				
				this.arms.push(pivotingMechArm.newArm( -80,0,-48,0));
				this.arms.push(pivotingMechArm.newArm( -48,0,-16,0));//
				this.arms.push(pivotingMechArm.newArm( 16,0,48,0));
				this.arms.push(pivotingMechArm.newArm( 48,0,80,0));
				this.arms.push(pivotingMechArmLarge.newArm( -16,0,16,0));//
				
				this.arms[1].type = type_line_welder;
				this.arms[2].type = type_line_welder;
				this.arms[0].seglength = 40;
				this.arms[1].seglength = 40;
				this.arms[2].seglength = 40;
				this.arms[3].seglength = 40;
				this.arms[4].seglength = 80;
			},
			drawOntop(){
				let target = (this.getProgress()-0.5)*32*5;
				target += this.getProgress()<0.5? 32: -32;
				
				this.platformy += (target-this.platformy)*0.03;
				for(let i =0;i<this.arms.length;i++){
					this.arms[i].resetRail(this.arms[i].fromX, this.platformy,this.arms[i].toX, this.platformy);
				}
				drawOrientedRect(expoplatform,this.x,this.y,0,this.platformy*Draw.scl,this.rotdeg(),90);
			},
		}));
	}

})
);
