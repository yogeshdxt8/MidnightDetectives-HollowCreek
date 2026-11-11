import * as THREE from 'three';
import { stepVehicle, sedanTuning, type VehicleState } from './physics/vehicle-dynamics';
import { createDetectiveCharacter } from './characters/detective-character';
import { createFourGatesEnvironment } from './environments/four-gates-environment';
import { createHollowCreekDressing } from './environments/hollow-creek-dressing';
import { createSupernaturalAtmosphere } from './environments/supernatural-atmosphere';
import { createStealthEscapeEncounter } from './gameplay/stealth-escape';
import { PlayablesPlatform } from './platform/playables-sdk';
import { GamePersistence } from './platform/game-persistence';
import { GameAudio } from './platform/game-audio';
import { calculateInvestigationScore } from './domain/investigation-score';
import { captureInvestigationSave } from './domain/investigation-save-projection';
import './style.css';
import { discoverClue, initialState, isClueWithinRange, evaluatePrototypeDeduction, prototypeDeductionOptions, type Clue } from './domain/investigation';
import { createPuzzleState, interactWithPuzzle, resetPuzzle, type EnvironmentalPuzzleDefinition, type EnvironmentalPuzzleState } from './domain/environmental-puzzle';
import { createRelicState, updateRelicAvailability, collectRelic, type EnvironmentalRelicDefinition, type EnvironmentalRelicState } from './domain/environmental-relic';
import { createInvestigationLeadState, revealInvestigationLead, trackInvestigationLead, type InvestigationLeadDefinition, type InvestigationLeadState } from './domain/investigation-lead';
import { createInvestigationChainState, unlockInvestigationLocation, searchInvestigationLocation, type InvestigationLocationDefinition, type InvestigationChainState } from './domain/investigation-chain';
import { createServicePanelPuzzleState, interactWithServicePanel, resetServicePanelPuzzle, type ServicePanelPuzzleDefinition, type ServicePanelPuzzleState } from './domain/service-panel-puzzle';
import { createKeeperEncounterState, unlockKeeperEncounter, askKeeperAbout, presentEvidenceToKeeper, type KeeperEncounterDefinition, type KeeperEncounterState } from './domain/keeper-encounter';
import { createMaintenanceYardState, searchMaintenanceYard, collectYardRegulator, submitYardDeduction, type MaintenanceYardDefinition, type MaintenanceYardState } from './domain/maintenance-yard';
import { createValeEncounterState, unlockValeEncounter, askValeAbout, presentEvidenceToVale, type ValeEncounterDefinition, type ValeEncounterState } from './domain/vale-encounter';
import { createPumpHouseState, searchPumpHouse, turnPumpHouseMechanism, recoverPumpHouseLedger, submitPumpHouseDeduction, type PumpHouseDefinition, type PumpHouseState } from './domain/pump-house';
import { createInvestigationBoardState, addBoardEvidence, selectBoardEvidence, connectBoardEvidence, type InvestigationBoardDefinition, type InvestigationBoardState } from './domain/investigation-board';
import { createRecordsOfficeState, searchRecordsOffice, classifyArchiveDocument, revealHistoricalIncident, type RecordsOfficeDefinition, type RecordsOfficeState } from './domain/records-office';
import { createWaterworksState, searchWaterworksObject, beginWaterworksTimeline, placeWaterworksTimelineEvent, revealWaterworksHistoricalLink, type WaterworksDefinition, type WaterworksState } from './domain/waterworks';
const fountainPuzzle:EnvironmentalPuzzleDefinition={id:'fountain-seal',title:'The fountain seal',description:'Align the symbols in the order hinted at by the torn note.',sequence:['moon','star','bell'],requiredClueIds:['note'],maxMistakes:3,successFeedback:'The fountain seal releases. A hidden compartment opens beneath the rim.'};
const fountainRelic:EnvironmentalRelicDefinition={id:'fountain-relic',name:'Fountain relic',description:'A small golden relic recovered from the hidden compartment beneath the fountain.',requiredPuzzleId:fountainPuzzle.id};
const relicLead:InvestigationLeadDefinition={id:'clocktower-service-door',title:'A mark pointing to the clock tower',sourceRelicId:fountainRelic.id,observation:'Beneath the relic is a tiny three-line mark, deliberately cut into the metal. It is not decoration: the edges are worn as if it was meant to be matched against another surface.',nextObjective:'Find where the same three-line mark appears elsewhere in Hollow Creek.',locationHint:'Begin with the clock tower service entrance.'};
const clockTowerLocation:InvestigationLocationDefinition={id:'clocktower-service-entrance',title:'Clock Tower Service Entrance',requiredLeadId:relicLead.id,evidence:{id:'three-line-imprint',title:'Three-line metal imprint',description:'A matching three-line mark is pressed into a service-panel screw plate. The plate has been removed and replaced several times, leaving fresh scratches around its edges.'},followUpPuzzleId:'service-panel-sequence',followUpPuzzleTitle:'The service-panel sequence'};
const servicePanelPuzzle:ServicePanelPuzzleDefinition={id:'service-panel-sequence',title:'The service-panel sequence',sequence:['three-line','crescent','keyhole'],requiredEvidenceId:'three-line-imprint',maxMistakes:3};
const wallMessageLead:InvestigationLeadDefinition={id:'message-in-the-wall',title:'A message behind the service panel',sourceRelicId:'',sourceEvidenceId:'three-line-imprint',observation:'Behind the panel is a narrow strip of paper, folded twice and sealed with dark wax. Only a fragment remains: “Ask the keeper what was moved before the bell stopped.”',nextObjective:'Find the person who maintains the clock tower and ask what was moved.',locationHint:'The tower keeper may be found near the old maintenance yard.'};
const keeperDefinition:KeeperEncounterDefinition={id:'clock-tower-keeper',name:'Clock Tower Keeper',requiredEvidenceIds:['three-line-imprint','keeper-message'],presentedEvidenceId:'keeper-message',evidenceResponse:'The keeper studies the wax seal, then goes quiet. “That mark belongs to the old regulator assembly. The brass regulator was moved to the maintenance yard before the bell stopped. I was told never to mention it.”',followUpLeadId:'regulator-at-maintenance-yard',followUpLeadTitle:'The missing brass regulator',topics:[{id:'clock',label:'The stopped bell',response:'“The bell stopped at exactly 11:17. It did not wind down. It was stopped deliberately.”'},{id:'maintenance',label:'Tower maintenance',response:'“I maintain the clock, but someone opened the service panel from the inside. The outer lock was untouched.”'},{id:'missing-object',label:'What was moved?',response:'“A heavy brass regulator was taken from the mechanism. Without it, the clock cannot keep time.”'}]};
const keeperLead:InvestigationLeadDefinition={id:'regulator-at-maintenance-yard',title:'The missing brass regulator',sourceRelicId:'',sourceEvidenceId:'keeper-message',observation:'The keeper identifies the missing object as a brass regulator removed before the bell stopped.',nextObjective:'Search the old maintenance yard for the regulator and whoever moved it.',locationHint:'The old maintenance yard lies beyond the clock tower service lane.'};
const valeDefinition:ValeEncounterDefinition={id:'elias-vale',requiredEvidenceIds:['brass-regulator','signed-work-order','matching-tool-mark'],decisiveEvidenceId:'signed-work-order',response:'Elias lowers his voice. “I moved the regulator, but the order came from someone else. The keeper was frightened. The name is in a sealed ledger hidden beneath the old pump house.”',followUpLeadId:'sealed-ledger',followUpLeadTitle:'The sealed ledger',topics:[{id:'transfer-order',label:'The transfer order',response:'“I only carried out what was written on the order. The signature was not mine.”'},{id:'regulator',label:'The brass regulator',response:'“I moved it because I was told the clock would be safer without it.”'},{id:'keeper',label:'The keeper',response:'“He did not give me the order. He was afraid of whoever did.”'}]};
const boardDefinition:InvestigationBoardDefinition={evidence:[{id:'print',title:'Muddy footprint',description:'A partial footprint near the square.'},{id:'key',title:'Old brass key',description:'A key recovered near the fountain.'},{id:'note',title:'Torn note',description:'A fragment referring to the clock.'},{id:'three-line-imprint',title:'Three-line imprint',description:'A repeated mark on the service panel.'},{id:'keeper-message',title:'Keeper message',description:'The keeper confirms the regulator was moved.'},{id:'brass-regulator',title:'Brass regulator',description:'The recovered clock mechanism.'},{id:'signed-work-order',title:'Signed work order',description:'Transfer order bearing E.V. initials.'},{id:'matching-tool-mark',title:'Matching tool mark',description:'Crescent-shaped scoring on the bracket.'},{id:'blue-sealing-wax',title:'Blue sealing wax',description:'Fresh wax behind the pump housing.'},{id:'crescent-order-mark',title:'Crescent order mark',description:'Repeated seal in the recovered ledger.'},{id:'earlier-incident-authorization',title:'Earlier incident authorization',description:'An authorization sheet bearing the crescent seal, dated years before the missing regulator.'},{id:'damaged-timing-mechanism',title:'Damaged timing mechanism',description:'A timing assembly recovered from the old waterworks.'},{id:'witness-sound-trace',title:'Witness sound trace',description:'Three impacts travelled through the water channel before 11:17.'},{id:'shared-mechanism-design',title:'Shared mechanism design',description:'The old timing assembly and the missing regulator use the same modified crescent-notch design.'},{id:'incident-log',title:'Waterworks incident log',description:'A pressure failure was recorded shortly before 11:17.'},{id:'clock-stop-record',title:'Clock stop record',description:'The clock tower mechanism stopped at exactly 11:17.'}],requiredConnections:[{id:'transfer',evidenceIds:['signed-work-order','matching-tool-mark'],conclusion:'The regulator was physically moved using the matching maintenance tool.'},{id:'sealed-order',evidenceIds:['blue-sealing-wax','crescent-order-mark'],conclusion:'The ledger order and wax traces are part of the same sealed instruction.'},{id:'authorizer',evidenceIds:['matching-tool-mark','crescent-order-mark'],conclusion:'The repeated crescent links the regulator transfer to an unidentified authorizer.'}]};
const recordsDefinition:RecordsOfficeDefinition={id:'hollow-creek-records',requiredLeadId:'crescent-seal',classificationSequence:['incident-report','transfer-order','witness-statement'],historicalEvidenceId:'earlier-incident-authorization',documents:[{id:'archive-incident-17',title:'Incident Report 17',category:'incident-report',description:'A power interruption at the old waterworks, dated several years before the missing regulator.'},{id:'archive-transfer-04',title:'Transfer Order 04',category:'transfer-order',description:'A sealed instruction concerning the movement of a brass clock component.'},{id:'archive-witness-09',title:'Witness Statement 09',category:'witness-statement',description:'A witness heard the bell before the time recorded in the official report.'}]};
const waterworksDefinition:WaterworksDefinition={id:'old-waterworks',requiredLeadId:'earlier-incident',timingMechanismEvidenceId:'damaged-timing-mechanism',witnessEvidenceId:'witness-sound-trace',stopTime:'11:17',timelineSequence:['pressure-failure','channel-impacts','clock-stops'],historicalLinkEvidenceId:'shared-mechanism-design'};
const pumpHouseDefinition:PumpHouseDefinition={id:'old-pump-house',requiredLeadId:valeDefinition.followUpLeadId,mechanismSequence:['crescent','three-lines','key'],evidenceIds:['blue-sealing-wax','crescent-order-mark'],correctDeductionId:'unknown-authorizer'};
const maintenanceYardDefinition:MaintenanceYardDefinition={id:'old-maintenance-yard',requiredLeadId:keeperLead.id,regulatorId:'brass-regulator',evidenceIds:['signed-work-order','matching-tool-mark'],correctDeductionId:'keeper-assistant'};
const clues:readonly Clue[]=[{id:'note',title:'Torn note',description:'A torn note is caught beneath the noticeboard.'},{id:'print',title:'Muddy footprint',description:'A muddy footprint leads away from the clock tower.'},{id:'key',title:'Brass key',description:'A small brass key lies beside the fountain.'}];
const root=document.querySelector<HTMLDivElement>('#scene-root');if(!root)throw new Error('Missing scene root');
const sceneRoot=root;const scene=new THREE.Scene();scene.background=new THREE.Color('#17243a');const stormFog=new THREE.FogExp2('#17243a',.027);scene.fog=stormFog;
const camera=new THREE.PerspectiveCamera(48,1,.1,100);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;sceneRoot.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight('#b9cbea','#202b40',1.45));const moon=new THREE.DirectionalLight('#d5e2f5',1.35);moon.position.set(-5,10,6);scene.add(moon);const characterRim=new THREE.DirectionalLight('#8daed8',.72);characterRim.position.set(4,4,5);scene.add(characterRim);const squareFill=new THREE.PointLight('#d39a61',.48,18,2);squareFill.position.set(0,4,-7);scene.add(squareFill);
const supernaturalAtmosphere=createSupernaturalAtmosphere(scene);
/* Hollow Creek arrival: a period-style sedan delivers the detective before the storm breaks. */
const arrivalCar=new THREE.Group();scene.add(arrivalCar);arrivalCar.position.set(-3.8,0,5.5);arrivalCar.rotation.y=0;
let sedanState:VehicleState={x:-3.8,z:5.5,yaw:0,speed:0,steering:0};
const gatePlaneZ=-13.6;
// Resolve the intro flag before constructing either seated character rig.
const playArrivalSequence=!sessionStorage.getItem('hollow-creek-arrival-seen');
const townBuildingBounds=[{minX:-10.75,maxX:-5.45,minZ:-9.9,maxZ:-5.7},{minX:5.65,maxX:10.65,minZ:-11.15,maxZ:-6.65},{minX:-11.15,maxX:-5.65,minZ:-19.75,maxZ:-15.25},{minX:5.35,maxX:11.15,minZ:-20.4,maxZ:-16.0}];
const circleRectClear=(x:number,z:number,yaw:number,halfLength:number,halfWidth:number,cx:number,cz:number,radius:number)=>{const dx=cx-x,dz=cz-z,c=Math.cos(yaw),sn=Math.sin(yaw);const localX=dx*c-dz*sn,localZ=dx*sn+dz*c;const nearestX=THREE.MathUtils.clamp(localX,-halfLength,halfLength),nearestZ=THREE.MathUtils.clamp(localZ,-halfWidth,halfWidth);return Math.hypot(localX-nearestX,localZ-nearestZ)>=radius;};
const sedanFootprintClear=(x:number,z:number,yaw:number)=>{const halfLength=1.94,halfWidth=.88,c=Math.cos(yaw),sn=Math.sin(yaw);for(const lx of [-halfLength,halfLength])for(const lz of [-halfWidth,halfWidth]){const wx=x+lx*c+lz*sn,wz=z-lx*sn+lz*c;if(townBuildingBounds.some(b=>wx>b.minX-.04&&wx<b.maxX+.04&&wz>b.minZ-.04&&wz<b.maxZ+.04))return false;}if(!circleRectClear(x,z,yaw,halfLength,halfWidth,0,-2.8,1.72))return false;return true;};
type DriveWaypoint={x:number;z:number;speed:number};
const driveRoutes={
  approach:[{x:3.25,z:5.5,speed:3.8}],
  dropoff:[{x:4.05,z:4.4,speed:2.8},{x:4.55,z:2.4,speed:2.7},{x:4.35,z:.2,speed:2.5},{x:3.75,z:-1.7,speed:2.2},{x:4.0,z:-4.3,speed:1.5}],
  departure:[{x:4.45,z:-3.7,speed:1.8},{x:4.8,z:-1.0,speed:2.0},{x:4.65,z:2.0,speed:2.5},{x:3.2,z:5.2,speed:3.0},{x:3.2,z:12.5,speed:4.2}]
} satisfies Record<string,DriveWaypoint[]>;
let activeDriveRoute:DriveWaypoint[]=driveRoutes.approach;
let driveWaypointIndex=0;
let driverBlockedSeconds=0;
const setDriveRoute=(route:DriveWaypoint[])=>{if(activeDriveRoute!==route){activeDriveRoute=route;driveWaypointIndex=0;driverBlockedSeconds=0;}};
const advanceDriveWaypoint=()=>{while(driveWaypointIndex<activeDriveRoute.length-1){const point=activeDriveRoute[driveWaypointIndex]!;if(Math.hypot(point.x-sedanState.x,point.z-sedanState.z)>.72)break;driveWaypointIndex++;}};
const applySedanPhysics=(dt:number,_targetX:number,_targetZ:number,maxSpeed:number,gateOpen:boolean)=>{
  advanceDriveWaypoint();
  const waypoint=activeDriveRoute[driveWaypointIndex]??{x:_targetX,z:_targetZ,speed:maxSpeed};
  const dx=waypoint.x-sedanState.x,dz=waypoint.z-sedanState.z;
  const c=Math.cos(sedanState.yaw),sn=Math.sin(sedanState.yaw);
  const localX=dx*c-dz*sn,localZ=dx*sn+dz*c;
  const distance=Math.hypot(dx,dz);
  const lookAhead=Math.max(1.8,Math.min(4.2,1.35+Math.abs(sedanState.speed)*.72));
  const alpha=Math.atan2(localZ,Math.max(.05,localX));
  // Pure-pursuit bicycle steering: curvature is based on a look-ahead point,
  // not a direct heading snap. Positive steering turns the car toward world -Z.
  const curvature=2*Math.sin(alpha)/Math.max(lookAhead,distance*.35);
  const steering=THREE.MathUtils.clamp(-Math.atan(sedanTuning.wheelbase*curvature)/sedanTuning.maxSteeringAngle,-1,1);
  const cornerFactor=THREE.MathUtils.clamp(1-Math.abs(steering)*.48,.42,1);
  const brakingDistance=Math.max(0,distance-.5);
  const stoppingSpeed=Math.sqrt(2*3.2*brakingDistance);
  const routeSpeed=Math.min(maxSpeed,waypoint.speed,stoppingSpeed)*cornerFactor;
  const throttle=distance>.28&&sedanState.speed<routeSpeed-.12?1:0;
  const brake=sedanState.speed>routeSpeed+.08||distance<=.28?THREE.MathUtils.clamp((sedanState.speed-routeSpeed)*.65,.18,1):0;
  const previous={...sedanState};
  const result=stepVehicle(sedanState,{throttle,brake,steering},dt,sedanTuning,gateOpen?undefined:gatePlaneZ);
  let blocked=false;
  for(let sample=1;sample<=6;sample++){
    const p=sample/6,x=THREE.MathUtils.lerp(previous.x,result.state.x,p),z=THREE.MathUtils.lerp(previous.z,result.state.z,p);
    let yawDelta=result.state.yaw-previous.yaw;while(yawDelta>Math.PI)yawDelta-=Math.PI*2;while(yawDelta< -Math.PI)yawDelta+=Math.PI*2;
    const yaw=previous.yaw+yawDelta*p;
    if(!sedanFootprintClear(x,z,yaw)){blocked=true;break;}
  }
  if(blocked){driverBlockedSeconds+=dt;sedanState={...previous,speed:Math.max(0,previous.speed-sedanTuning.serviceBrake*dt),steering:0};}
  else{driverBlockedSeconds=0;sedanState=result.state;}
  arrivalCar.position.set(sedanState.x,0,sedanState.z);arrivalCar.rotation.y=sedanState.yaw;
  carWheels.forEach(w=>w.rotation.z+=(blocked?0:result.wheelAngularSpeed)*dt);
  return {...result,state:sedanState,blockedByGate:result.blockedByGate||blocked};
};
// Character locomotion uses acceleration, braking distance, ground contact and conservative obstacle clearance.
const moveArrivalActor=(actor:THREE.Group,target:THREE.Vector3,dt:number,maxSpeed=1.8)=>{const velocity=(actor.userData['arrivalVelocity'] as THREE.Vector3|undefined)??new THREE.Vector3();actor.userData['arrivalVelocity']=velocity;const offset=new THREE.Vector3(target.x-actor.position.x,0,target.z-actor.position.z);const distance=offset.length();const acceleration=7.5;const brakingSpeed=Math.sqrt(Math.max(0,2*acceleration*Math.max(0,distance-.08)));const desiredSpeed=Math.min(maxSpeed,brakingSpeed);const desired=distance>.025?offset.normalize().multiplyScalar(desiredSpeed):new THREE.Vector3();const delta=desired.sub(velocity);const maxDelta=acceleration*dt;if(delta.length()>maxDelta)delta.setLength(maxDelta);velocity.add(delta);const step=velocity.clone().multiplyScalar(dt);const tryPosition=actor.position.clone().add(step);tryPosition.y=0;const clear=(x:number,z:number)=>{const fountainClear=Math.hypot(x,z+2.8)>1.65+.48;const local=arrivalCar.worldToLocal(new THREE.Vector3(x,0,z));const inDriverDoorApproach=actor===arrivalDriver.root&&local.x> -1.25&&local.x<.2&&local.z>.55&&local.z<1.38;const carClear=actor.parent===arrivalCar||inDriverDoorApproach||(Math.abs(local.x)>2.12||Math.abs(local.z)>1.02);const buildingsClear=townBuildingBounds.every(b=>x<b.minX-.42||x>b.maxX+.42||z<b.minZ-.42||z>b.maxZ+.42);return fountainClear&&carClear&&buildingsClear;};if(clear(tryPosition.x,tryPosition.z))actor.position.copy(tryPosition);else{const xOnly=clear(actor.position.x+step.x,actor.position.z);const zOnly=clear(actor.position.x,actor.position.z+step.z);if(xOnly)actor.position.x+=step.x;if(zOnly)actor.position.z+=step.z;if(!xOnly&&!zOnly)velocity.multiplyScalar(.15);}actor.position.y=0;if(velocity.length()>.04)actor.rotation.y=Math.atan2(velocity.x,velocity.z);if(distance<.07&&velocity.length()<.12){velocity.set(0,0,0);return true;}return false;};
const arrivalDoorWorld=(localX:number,localZ:number)=>arrivalCar.localToWorld(new THREE.Vector3(localX,0,localZ));
const arrivalDriver=createDetectiveCharacter();arrivalDriver.root.scale.setScalar(.78);arrivalDriver.root.position.set(0,0,.38);arrivalDriver.root.rotation.y=Math.PI/2;arrivalDriver.root.visible=!playArrivalSequence;arrivalCar.add(arrivalDriver.root);
const arrivalGate=new THREE.Group();scene.add(arrivalGate);arrivalGate.position.z=gatePlaneZ;const gateMetal=new THREE.MeshStandardMaterial({color:'#293747',metalness:.82,roughness:.32});const gateGold=new THREE.MeshStandardMaterial({color:'#b99b65',metalness:.6,roughness:.4});
const gateLeaves:THREE.Group[]=[];for(const side of [-1,1]){const leaf=new THREE.Group();leaf.position.set(side*2.6,0,0);arrivalGate.add(leaf);const frame=new THREE.Mesh(new THREE.BoxGeometry(2.6,.16,.16),gateGold);frame.position.set(-side*1.3,2.2,0);leaf.add(frame);for(let i=0;i<12;i++){const bar=new THREE.Mesh(new THREE.BoxGeometry(.075,2.2,.075),gateMetal);bar.position.set(-side*(.12+i*.215),1.1,0);leaf.add(bar);}gateLeaves.push(leaf);}
const arrivalDogs:THREE.Group[]=[];for(let i=0;i<4;i++){const dog=new THREE.Group();const fur=new THREE.MeshStandardMaterial({color:['#302b29','#6a4b36','#242a31','#8a7860'][i],roughness:.95});const body=new THREE.Mesh(new THREE.BoxGeometry(.82,.42,.34),fur);body.position.y=.48;dog.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.23,10,8),fur);head.position.set(.34,.72,0);dog.add(head);const muzzle=new THREE.Mesh(new THREE.BoxGeometry(.22,.13,.2),fur);muzzle.position.set(.52,.65,0);dog.add(muzzle);for(const side of [-1,1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(.09,.24,6),fur);ear.position.set(.25,.94,side*.13);ear.rotation.z=-.25;dog.add(ear);}for(const x of [-.25,.25])for(const z of [-.11,.11]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,.42,6),fur);leg.position.set(x,.22,z);dog.add(leg);}const tail=new THREE.Mesh(new THREE.CylinderGeometry(.035,.055,.38,6),fur);tail.position.set(-.5,.68,0);tail.rotation.z=-.8;dog.add(tail);const spawnPoints=[[-8,0], [8,0], [0,-10], [0,9]] as const;dog.position.set(spawnPoints[i]![0],0,spawnPoints[i]![1]);dog.visible=false;scene.add(dog);arrivalDogs.push(dog);}
const arrivalDialogue=document.createElement('div');arrivalDialogue.setAttribute('aria-live','polite');arrivalDialogue.style.cssText='position:absolute;left:50%;top:36%;transform:translateX(-50%);z-index:8;max-width:82%;padding:12px 18px;border:1px solid #c6ad78;border-radius:14px;background:rgba(8,13,23,.92);color:#f1dfb6;font:600 14px/1.45 system-ui,sans-serif;text-align:center;letter-spacing:.04em;box-shadow:0 8px 30px #0008;pointer-events:none;display:none;';sceneRoot.appendChild(arrivalDialogue);
let arrivalSequenceStarted=false;let arrivalSequenceComplete=false;let dogsBarking=false;const driverExitStart=new THREE.Vector3();const driverReturnStart=new THREE.Vector3();let driverReturnStarted=false;let driverReturnPhase=0;let driverReturnReached=false;let driverReentered=false;sessionStorage.setItem('hollow-creek-arrival-seen','1');if(!playArrivalSequence){arrivalCar.visible=false;arrivalDriver.root.visible=false;arrivalDogs.forEach(dog=>dog.visible=false);}
const carPaint=new THREE.MeshStandardMaterial({color:'#35465d',metalness:.38,roughness:.48});
const carTrim=new THREE.MeshStandardMaterial({color:'#9a7950',metalness:.68,roughness:.32});
const carGlass=new THREE.MeshStandardMaterial({color:'#26394d',metalness:.12,roughness:.28,transparent:true,opacity:.72});
const tireMat=new THREE.MeshStandardMaterial({color:'#090d14',roughness:.94});
const lampMat=new THREE.MeshStandardMaterial({color:'#ffe2a0',emissive:'#ffbd62',emissiveIntensity:2.2});
const carPart=(geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=arrivalCar)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
carPart(new THREE.BoxGeometry(3.65,.78,1.48),carPaint,0,.72,0);
carPart(new THREE.BoxGeometry(1.85,.76,1.28),carPaint,-.18,1.36,0);
carPart(new THREE.BoxGeometry(1.62,.48,1.3),carGlass,-.18,1.39,0);
carPart(new THREE.BoxGeometry(.12,.68,1.52),carTrim,1.72,.72,0);
carPart(new THREE.BoxGeometry(.1,.68,1.52),carTrim,-1.72,.72,0);
carPart(new THREE.BoxGeometry(.12,.28,1.52),carTrim,0,.42,0);
const carWheels:THREE.Mesh[]=[];
for(const x of [-1.12,1.12])for(const z of [-.77,.77]){const wheel=carPart(new THREE.CylinderGeometry(.39,.39,.2,12),tireMat,x,.4,z);wheel.rotation.x=Math.PI/2;carWheels.push(wheel);carPart(new THREE.CylinderGeometry(.19,.19,.205,10),carTrim,x,.4,z);}
for(const z of [-.48,.48]){carPart(new THREE.BoxGeometry(.12,.22,.28),lampMat,1.83,.87,z);carPart(new THREE.BoxGeometry(.08,.18,.25),lampMat,-1.83,.86,z);}
const cabinFill=new THREE.PointLight('#b9cde8',1.7,8,2);cabinFill.position.set(0,2.4,0);arrivalCar.add(cabinFill);const headlampLeft=new THREE.SpotLight('#ffe1a1',0,24,.48,.55,1.2);headlampLeft.position.set(1.8,.9,-.48);headlampLeft.target.position.set(8,.1,-.48);arrivalCar.add(headlampLeft,headlampLeft.target);
const headlampRight=new THREE.SpotLight('#ffe1a1',0,24,.48,.55,1.2);headlampRight.position.set(1.8,.9,.48);headlampRight.target.position.set(8,.1,.48);arrivalCar.add(headlampRight,headlampRight.target);
const driverDoorPivot=new THREE.Group();driverDoorPivot.position.set(-.58,.98,.76);arrivalCar.add(driverDoorPivot);
const passengerDoorPivot=new THREE.Group();passengerDoorPivot.position.set(-.58,.98,-.76);arrivalCar.add(passengerDoorPivot);
carPart(new THREE.BoxGeometry(.82,.82,.09),carPaint,.36,-.1,0,passengerDoorPivot);
carPart(new THREE.BoxGeometry(.52,.08,.11),carTrim,.36,.27,0,passengerDoorPivot);
carPart(new THREE.BoxGeometry(.82,.82,.09),carPaint,.36,-.1,0,driverDoorPivot);
carPart(new THREE.BoxGeometry(.52,.08,.11),carTrim,.36,.27,0,driverDoorPivot);
const rainCount=150;const rainPositions=new Float32Array(rainCount*3);
for(let i=0;i<rainCount;i++){rainPositions[i*3]=(Math.random()-.5)*22;rainPositions[i*3+1]=Math.random()*12;rainPositions[i*3+2]=(Math.random()-.5)*24;}
const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
const rain=new THREE.Points(rainGeometry,new THREE.PointsMaterial({color:'#a9c9e8',size:.085,transparent:true,opacity:.82,depthWrite:false}));scene.add(rain);
const lightningGroup=new THREE.Group();scene.add(lightningGroup);
const lightningFlash=new THREE.PointLight('#d9eaff',0,42,1.5);lightningFlash.position.set(-3,10,-8);scene.add(lightningFlash);
let nextLightningAt=1.1;let lightningOffAt=0;let stormStarted=true;

const makeLightning=()=>{lightningGroup.clear();const points:THREE.Vector3[]=[];let x=(Math.random()-.5)*13,y=10,z=-10+(Math.random()-.5)*5;points.push(new THREE.Vector3(x,y,z));for(let i=0;i<6;i++){x+=(Math.random()-.5)*2.3;y-=1.55;z+=(Math.random()-.5)*1.2;points.push(new THREE.Vector3(x,y,z));}const geometry=new THREE.BufferGeometry().setFromPoints(points);const bolt=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#e8f4ff'}));lightningGroup.add(bolt);};

const fourGatesEnvironment=createFourGatesEnvironment();scene.add(fourGatesEnvironment.root);
const hollowCreekDressing=createHollowCreekDressing();scene.add(hollowCreekDressing.root);
const fountain=new THREE.Mesh(new THREE.CylinderGeometry(1.45,1.65,.5,12),new THREE.MeshStandardMaterial({color:'#667184'}));fountain.position.set(0,.25,-2.8);fountain.userData['collisionRadius']=1.65;scene.add(fountain);
const water=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.25,.08,12),new THREE.MeshStandardMaterial({color:'#536f89',metalness:.3,roughness:.25}));water.position.set(0,.55,-2.8);scene.add(water);
const compartment=new THREE.Group();compartment.position.set(0,.61,-2.8);scene.add(compartment);
const cavity=new THREE.Mesh(new THREE.CylinderGeometry(.37,.37,.035,16),new THREE.MeshStandardMaterial({color:'#080e19',roughness:1}));
cavity.position.y=-.005;compartment.add(cavity);
const compartmentRim=new THREE.Mesh(new THREE.TorusGeometry(.4,.045,6,20),new THREE.MeshStandardMaterial({color:'#a88b57',metalness:.55,roughness:.38}));
compartmentRim.rotation.x=Math.PI/2;compartmentRim.position.y=.018;compartment.add(compartmentRim);
const lidHinge=new THREE.Group();lidHinge.position.set(0,.055,-.36);compartment.add(lidHinge);
const compartmentLid=new THREE.Mesh(new THREE.CylinderGeometry(.39,.39,.075,16),new THREE.MeshStandardMaterial({color:'#68758a',metalness:.45,roughness:.42}));
compartmentLid.position.z=.36;lidHinge.add(compartmentLid);
const lidMark=new THREE.Mesh(new THREE.TorusGeometry(.2,.018,5,16),new THREE.MeshStandardMaterial({color:'#d8bd80',metalness:.5,roughness:.4}));
lidMark.rotation.x=Math.PI/2;lidMark.position.set(0,.04,.36);lidHinge.add(lidMark);
const hiddenRelic=new THREE.Group();hiddenRelic.position.set(0,.1,0);compartment.add(hiddenRelic);
const relicStem=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,.38,8),new THREE.MeshStandardMaterial({color:'#d8bd80',metalness:.7,roughness:.25,emissive:'#9b6c2e',emissiveIntensity:.35}));
relicStem.position.y=.2;hiddenRelic.add(relicStem);
const relicLoop=new THREE.Mesh(new THREE.TorusGeometry(.13,.035,6,16),new THREE.MeshStandardMaterial({color:'#e4c47d',metalness:.7,roughness:.22,emissive:'#9b6c2e',emissiveIntensity:.4}));
relicLoop.position.y=.43;hiddenRelic.add(relicLoop);
const relicLight=new THREE.PointLight('#e8c77f',0,2.2);relicLight.position.set(0,.55,0);compartment.add(relicLight);
let compartmentOpen=false;let compartmentReveal=0;let relicState:EnvironmentalRelicState=createRelicState(fountainRelic);let leadState:InvestigationLeadState=createInvestigationLeadState();let wallMessageLeadState:InvestigationLeadState=createInvestigationLeadState();let currentLead:InvestigationLeadDefinition=relicLead;let investigationChain:InvestigationChainState=createInvestigationChainState();let servicePuzzleState:ServicePanelPuzzleState=createServicePanelPuzzleState(servicePanelPuzzle);let keeperState:KeeperEncounterState=createKeeperEncounterState();let keeperLeadState:InvestigationLeadState=createInvestigationLeadState();let discoveredInvestigationEvidenceIds:string[]=[];let maintenanceYardState:MaintenanceYardState=createMaintenanceYardState(maintenanceYardDefinition);let valeState:ValeEncounterState=createValeEncounterState();let pumpHouseState:PumpHouseState=createPumpHouseState(pumpHouseDefinition);let boardState:InvestigationBoardState=createInvestigationBoardState();let recordsState:RecordsOfficeState=createRecordsOfficeState(recordsDefinition);let waterworksState:WaterworksState=createWaterworksState(waterworksDefinition);hiddenRelic.visible=false;
const positions:readonly [number,number,number][]=[[-3.3,.55,-1.2],[3.2,.3,-3.7],[1.8,.65,.6]];const clueMeshes:THREE.Mesh[]=[];
positions.forEach((p,i)=>{const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.24),new THREE.MeshStandardMaterial({color:'#e7c77f',emissive:'#a86e27',emissiveIntensity:1.8}));mesh.position.set(...p);mesh.userData['clueId']=clues[i]!.id;scene.add(mesh);clueMeshes.push(mesh);});
const detectiveRig=createDetectiveCharacter();
const player=detectiveRig.root;
const {leftLeg,rightLeg,leftArm,rightArm}=detectiveRig;
const stealthEscape=createStealthEscapeEncounter(scene,player,notify,playArrivalSequence?23.5:0);
if(playArrivalSequence){player.scale.setScalar(.78);arrivalCar.add(player);player.position.set(-.18,-.12,-.34);player.rotation.y=0;player.visible=false;}else{player.position.set(0,0,5.2);player.visible=true;scene.add(player);}
let state=initialState;let fountainPuzzleState:EnvironmentalPuzzleState=createPuzzleState(fountainPuzzle);const locationButton=document.querySelector<HTMLButtonElement>('#location-interact')!;const locationPanel=document.querySelector<HTMLElement>('#location-panel')!;const locationSearchButton=document.querySelector<HTMLButtonElement>('#location-search')!;const servicePuzzleButton=document.querySelector<HTMLButtonElement>('#service-puzzle-open')!;const servicePuzzlePanel=document.querySelector<HTMLElement>('#service-puzzle-panel')!;const servicePuzzleReset=document.querySelector<HTMLButtonElement>('#service-puzzle-reset')!;const keeperButton=document.querySelector<HTMLButtonElement>('#keeper-interact')!;const yardButton=document.querySelector<HTMLButtonElement>('#yard-interact')!;const regulatorButton=document.querySelector<HTMLButtonElement>('#regulator-interact')!;const yardPanel=document.querySelector<HTMLElement>('#yard-panel')!;const valeButton=document.querySelector<HTMLButtonElement>('#vale-interact')!;const valePanel=document.querySelector<HTMLElement>('#vale-panel')!;const pumpButton=document.querySelector<HTMLButtonElement>('#pump-interact')!;const pumpPanel=document.querySelector<HTMLElement>('#pump-panel')!;const boardButton=document.querySelector<HTMLButtonElement>('#board-open')!;const boardPanel=document.querySelector<HTMLElement>('#board-panel')!;const recordsButton=document.querySelector<HTMLButtonElement>('#records-interact')!;const recordsPanel=document.querySelector<HTMLElement>('#records-panel')!;const waterworksButton=document.querySelector<HTMLButtonElement>('#waterworks-interact')!;const waterworksPanel=document.querySelector<HTMLElement>('#waterworks-panel')!;const waterworksMarker=new THREE.Mesh(new THREE.OctahedronGeometry(.34),new THREE.MeshStandardMaterial({color:'#78b8c2',emissive:'#356e7a',emissiveIntensity:1.5}));waterworksMarker.position.set(0,.4,-7.5);waterworksMarker.visible=false;scene.add(waterworksMarker);const waterworksFloor=new THREE.Mesh(new THREE.PlaneGeometry(7,4.5),new THREE.MeshStandardMaterial({color:'#39494a',roughness:1}));waterworksFloor.rotation.x=-Math.PI/2;waterworksFloor.position.set(0,-.04,-7.4);waterworksFloor.visible=false;scene.add(waterworksFloor);const controlRoom=new THREE.Mesh(new THREE.BoxGeometry(2.4,1.9,1.8),new THREE.MeshStandardMaterial({color:'#4b5355',roughness:1}));controlRoom.position.set(-2,.95,-8);controlRoom.visible=false;scene.add(controlRoom);const channelGroup=new THREE.Group();for(let i=0;i<3;i++){const channel=new THREE.Mesh(new THREE.BoxGeometry(1.5,.08,.28),new THREE.MeshStandardMaterial({color:'#263f4a',metalness:.3,roughness:.35}));channel.position.set(0,.04,i*.48);channelGroup.add(channel);}channelGroup.position.set(.5,0,-8.2);channelGroup.visible=false;scene.add(channelGroup);const maintenanceBench=new THREE.Mesh(new THREE.BoxGeometry(1.8,.18,.65),new THREE.MeshStandardMaterial({color:'#594638',roughness:.9}));maintenanceBench.position.set(2,.8,-7.8);maintenanceBench.visible=false;scene.add(maintenanceBench);const timingMechanism=new THREE.Group();const timingGear=new THREE.Mesh(new THREE.TorusGeometry(.52,.09,8,18),new THREE.MeshStandardMaterial({color:'#a58c60',metalness:.8,roughness:.4}));timingGear.rotation.x=Math.PI/2;timingMechanism.add(timingGear);const brokenArm=new THREE.Mesh(new THREE.BoxGeometry(.85,.06,.08),new THREE.MeshStandardMaterial({color:'#b7a17a',metalness:.7}));brokenArm.position.set(.35,.3,0);brokenArm.rotation.z=-.5;timingMechanism.add(brokenArm);timingMechanism.position.set(2,.98,-7.8);timingMechanism.visible=false;scene.add(timingMechanism);const recordsMarker=new THREE.Mesh(new THREE.OctahedronGeometry(.32),new THREE.MeshStandardMaterial({color:'#d6b878',emissive:'#82652e',emissiveIntensity:1.3}));recordsMarker.position.set(4.25,.38,-5.5);recordsMarker.visible=false;scene.add(recordsMarker);const recordsFloor=new THREE.Mesh(new THREE.PlaneGeometry(4.8,4.2),new THREE.MeshStandardMaterial({color:'#4b4540',roughness:1}));recordsFloor.rotation.x=-Math.PI/2;recordsFloor.position.set(4.25,-.03,-5.5);recordsFloor.visible=false;scene.add(recordsFloor);const archiveShelfMaterial=new THREE.MeshStandardMaterial({color:'#594638',roughness:.95});const archiveShelf=new THREE.Group();for(let row=0;row<3;row++){const shelf=new THREE.Mesh(new THREE.BoxGeometry(2.6,.12,.55),archiveShelfMaterial);shelf.position.set(0,.45+row*.65,0);archiveShelf.add(shelf);for(let col=0;col<5;col++){const book=new THREE.Mesh(new THREE.BoxGeometry(.28,.42,.38),new THREE.MeshStandardMaterial({color:['#6c4540','#53606b','#82704c','#435b51','#765a76'][col],roughness:1}));book.position.set(-1+col*.5,.7+row*.65,0);archiveShelf.add(book);}}archiveShelf.position.set(4.7,0,-6.25);archiveShelf.visible=false;scene.add(archiveShelf);const filingCabinet=new THREE.Mesh(new THREE.BoxGeometry(.9,1.5,.7),new THREE.MeshStandardMaterial({color:'#626a6b',metalness:.55,roughness:.7}));filingCabinet.position.set(3.1,.75,-5.9);filingCabinet.visible=false;scene.add(filingCabinet);const yardDeductionPanel=document.querySelector<HTMLElement>('#yard-deduction-panel')!;const keeperPanel=document.querySelector<HTMLElement>('#keeper-panel')!;const pumpMarker=new THREE.Mesh(new THREE.OctahedronGeometry(.3),new THREE.MeshStandardMaterial({color:'#7dbac1',emissive:'#397e89',emissiveIntensity:1.5}));pumpMarker.position.set(-4.1,.35,-5.5);pumpMarker.visible=false;scene.add(pumpMarker);const pumpGround=new THREE.Mesh(new THREE.PlaneGeometry(5,4),new THREE.MeshStandardMaterial({color:'#343f43',roughness:1}));pumpGround.rotation.x=-Math.PI/2;pumpGround.position.set(-4.1,-.035,-5.5);pumpGround.visible=false;scene.add(pumpGround);const pumpShed=new THREE.Mesh(new THREE.BoxGeometry(2.5,1.7,2),new THREE.MeshStandardMaterial({color:'#414b50',roughness:1}));pumpShed.position.set(-4.6,.85,-6.4);pumpShed.visible=false;scene.add(pumpShed);const pumpWheel=new THREE.Mesh(new THREE.TorusGeometry(.55,.1,8,20),new THREE.MeshStandardMaterial({color:'#66757a',metalness:.75,roughness:.4}));pumpWheel.position.set(-3.6,.95,-5.6);pumpWheel.visible=false;scene.add(pumpWheel);const toast=document.querySelector<HTMLElement>('#toast');const relicButton=document.querySelector<HTMLButtonElement>('#relic-interact')!;const relicInventory=document.querySelector<HTMLElement>('#relic-inventory')!;const leadPanel=document.querySelector<HTMLElement>('#lead-panel')!;const leadTrackButton=document.querySelector<HTMLButtonElement>('#lead-track')!;const activeLead=document.querySelector<HTMLElement>('#active-lead')!;const relicRange=2.2;let toastTimer=0;
function notify(message:string){if(!toast)return;toast.textContent=message;toast.classList.add('show');window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>toast.classList.remove('show'),2200);}
function collectClue(mesh:THREE.Mesh):boolean{const id=mesh.userData['clueId'];if(typeof id!=='string'||state.discoveredClueIds.includes(id))return false;const next=discoverClue(state,id,clues);if(next===state)return false;state=next;mesh.visible=false;const clue=clues.find(item=>item.id===id)!;if(id==='note'){fountainPuzzleState=createPuzzleState(fountainPuzzle,state.discoveredClueIds);document.querySelector<HTMLButtonElement>('#puzzle-open')!.hidden=false;}notify('Evidence collected: '+clue.title);document.querySelector('#count')!.textContent=String(state.discoveredClueIds.length);const list=document.querySelector('#evidence')!;list.replaceChildren(...state.discoveredClueIds.map(found=>{const item=document.createElement('button');item.type='button';item.className='clue';item.dataset['clueId']=found;item.textContent='✦ '+clues.find(item=>item.id===found)!.title;return item;}));if(state.discoveredClueIds.length===3){const completionHint=document.querySelector<HTMLElement>('#hint');if(completionHint){completionHint.textContent='';completionHint.style.display='none';}document.querySelector('#status')!.textContent='EVIDENCE COLLECTION COMPLETE';const deductionOpen=document.querySelector<HTMLButtonElement>('#deduction-open');if(deductionOpen)deductionOpen.hidden=false;}scheduleGameSave();return true;}
function inspect(x:number,y:number){const r=renderer.domElement.getBoundingClientRect();let selected:THREE.Mesh|undefined;let best=Infinity;const projected=new THREE.Vector3();const radius=Math.max(76,Math.min(r.width,r.height)*.14);for(const mesh of clueMeshes){const id=mesh.userData['clueId'];if(typeof id!=='string'||state.discoveredClueIds.includes(id))continue;if(!isClueWithinRange(player.position.x,player.position.z,mesh.position.x,mesh.position.z,3.1))continue;mesh.getWorldPosition(projected);projected.project(camera);if(projected.z < -1||projected.z>1)continue;const sx=r.left+(projected.x+1)*.5*r.width,sy=r.top+(1-projected.y)*.5*r.height,d=Math.hypot(x-sx,y-sy);if(d<radius&&d<best){selected=mesh;best=d;}}if(!selected){let nearestDistance=Infinity;for(const mesh of clueMeshes){const id=mesh.userData['clueId'];if(typeof id!=='string'||state.discoveredClueIds.includes(id))continue;const distanceToPlayer=Math.hypot(player.position.x-mesh.position.x,player.position.z-mesh.position.z);if(distanceToPlayer<=3.1&&distanceToPlayer<nearestDistance){nearestDistance=distanceToPlayer;selected=mesh;}}}if(!selected){notify('Walk closer to a glowing clue to inspect it.');return;}const id=selected.userData['clueId'];if(typeof id!=='string')return;collectClue(selected);}
const detailPanel=document.querySelector<HTMLElement>('#evidence-detail')!;
const detailTitle=document.querySelector<HTMLElement>('#detail-title')!;
const detailDescription=document.querySelector<HTMLElement>('#detail-description')!;
function closeEvidenceDetail(){detailPanel.hidden=true;detailPanel.style.setProperty('display','none','important');}
document.querySelector('#detail-close')?.addEventListener('click',closeEvidenceDetail);
document.querySelector('#evidence')?.addEventListener('click',event=>{const target=event.target;if(!(target instanceof HTMLElement))return;const button=target.closest<HTMLButtonElement>('button[data-clue-id]');if(!button)return;const clue=clues.find(item=>item.id===button.dataset['clueId']);if(!clue)return;detailTitle.textContent=clue.title;detailDescription.textContent=clue.description;detailPanel.hidden=false;detailPanel.style.removeProperty('display');});
detailPanel.addEventListener('click',event=>{if(event.target===detailPanel)closeEvidenceDetail();});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeEvidenceDetail();});

const puzzlePanel=document.querySelector<HTMLElement>('#puzzle-panel')!;
const puzzleFeedback=document.querySelector<HTMLElement>('#puzzle-feedback')!;
const puzzleSequence=document.querySelector<HTMLElement>('#puzzle-sequence')!;
const puzzleResetButton=document.querySelector<HTMLButtonElement>('#puzzle-reset')!;
function closePuzzle(){puzzlePanel.hidden=true;puzzlePanel.style.setProperty('display','none','important');}
function renderPuzzleState(){puzzleFeedback.textContent=fountainPuzzleState.feedback;puzzleSequence.textContent=fountainPuzzleState.status==='solved'?'SEAL OPEN · 3 / 3':`${fountainPuzzleState.progress} / ${fountainPuzzle.sequence.length} ALIGNED · ${fountainPuzzleState.mistakes} / ${fountainPuzzle.maxMistakes} MISSES`;puzzleResetButton.hidden=fountainPuzzleState.status!=='failed';puzzlePanel.querySelectorAll<HTMLButtonElement>('[data-symbol]').forEach(button=>{button.disabled=fountainPuzzleState.status==='failed'||fountainPuzzleState.status==='solved';});}
document.querySelector('#puzzle-open')?.addEventListener('click',()=>{if(fountainPuzzleState.status==='locked'){notify('The torn note may explain this mechanism.');return;}renderPuzzleState();puzzlePanel.hidden=false;puzzlePanel.style.removeProperty('display');});
document.querySelector('#puzzle-close')?.addEventListener('click',closePuzzle);
puzzlePanel.addEventListener('click',event=>{if(event.target===puzzlePanel)closePuzzle();});
document.querySelector('#puzzle-actions')?.addEventListener('click',event=>{const target=event.target;if(!(target instanceof HTMLElement))return;const button=target.closest<HTMLButtonElement>('[data-symbol]');if(!button)return;const symbol=button.dataset['symbol'];if(!symbol)return;const result=interactWithPuzzle(fountainPuzzleState,fountainPuzzle,symbol,state.discoveredClueIds);fountainPuzzleState=result.state;renderPuzzleState();if(result.completed){compartmentOpen=true;hiddenRelic.visible=true;relicState=updateRelicAvailability(relicState,fountainRelic,[fountainPuzzle.id]);document.querySelector<HTMLButtonElement>('#puzzle-open')!.hidden=true;document.querySelector('#status')!.textContent='FOUNTAIN SEAL OPEN';notify('A hidden compartment opens beneath the fountain.');}else if(!result.accepted){notify(fountainPuzzleState.feedback);}});
puzzleResetButton.addEventListener('click',()=>{fountainPuzzleState=resetPuzzle(fountainPuzzleState);renderPuzzleState();});
function closeLeadPanel(){leadPanel.hidden=true;leadPanel.style.setProperty('display','none','important');}
const leadReviewButton=document.querySelector<HTMLButtonElement>('#lead-review')!;
leadReviewButton.addEventListener('click',()=>{leadPanel.hidden=false;leadPanel.style.removeProperty('display');});
document.querySelector('#lead-close')?.addEventListener('click',closeLeadPanel);
leadPanel.addEventListener('click',event=>{if(event.target===leadPanel)closeLeadPanel();});
function closeLocationPanel(){locationPanel.hidden=true;locationPanel.style.setProperty('display','none','important');}
locationPanel.addEventListener('click',event=>{if(event.target===locationPanel)closeLocationPanel();});
document.querySelector('#location-close')?.addEventListener('click',closeLocationPanel);
locationButton.addEventListener('click',()=>{if(investigationChain.locationStatus==='locked')return;locationPanel.hidden=false;locationPanel.style.removeProperty('display');});
function closeServicePuzzle(){servicePuzzlePanel.hidden=true;servicePuzzlePanel.style.setProperty('display','none','important');}
function closeKeeperPanel(){keeperPanel.hidden=true;keeperPanel.style.setProperty('display','none','important');}
function closeYardPanel(){yardPanel.hidden=true;yardPanel.style.setProperty('display','none','important');}
function closeValePanel(){valePanel.hidden=true;valePanel.style.setProperty('display','none','important');}
function closePumpPanel(){pumpPanel.hidden=true;pumpPanel.style.setProperty('display','none','important');}
function closeBoardPanel(){boardPanel.hidden=true;boardPanel.style.setProperty('display','none','important');}
function closeRecordsPanel(){recordsPanel.hidden=true;recordsPanel.style.setProperty('display','none','important');}
function closeWaterworksPanel(){waterworksPanel.hidden=true;waterworksPanel.style.setProperty('display','none','important');}
function renderWaterworksPanel(){document.querySelector<HTMLElement>('#waterworks-feedback')!.textContent=waterworksState.feedback;document.querySelectorAll<HTMLButtonElement>('[data-waterworks-object]').forEach(button=>{button.hidden=waterworksState.searchedObjectIds.includes(button.dataset['waterworksObject']??'');});document.querySelector<HTMLElement>('#waterworks-timeline')!.hidden=waterworksState.status!=='searched'&&waterworksState.status!=='timeline-open'&&waterworksState.status!=='incident-reconstructed';document.querySelector<HTMLElement>('#waterworks-timeline-progress')!.textContent='TIMELINE '+waterworksState.timelineProgress+' / '+waterworksDefinition.timelineSequence.length;document.querySelector<HTMLElement>('#waterworks-discovery')!.hidden=!waterworksState.historicalLinkDiscovered;document.querySelector<HTMLButtonElement>('#waterworks-start-timeline')!.hidden=waterworksState.status!=='searched';document.querySelector<HTMLButtonElement>('#waterworks-reveal-link')!.hidden=waterworksState.status!=='incident-reconstructed';}
function renderRecordsPanel(){document.querySelector<HTMLElement>('#records-feedback')!.textContent=recordsState.feedback;document.querySelector<HTMLButtonElement>('#records-search')!.hidden=recordsState.status!=='available';document.querySelector<HTMLElement>('#records-classification')!.hidden=recordsState.status!=='searched'&&recordsState.status!=='classification-open';document.querySelector<HTMLElement>('#records-history')!.hidden=recordsState.status!=='classified'&&recordsState.status!=='historical-discovery';document.querySelector<HTMLElement>('#records-next-lead')!.hidden=recordsState.status!=='historical-discovery';document.querySelector<HTMLElement>('#records-documents')!.replaceChildren(...recordsDefinition.documents.filter(doc=>recordsState.discoveredDocumentIds.includes(doc.id)).map(doc=>{const p=document.createElement('p');p.className='detail-observation';p.textContent=doc.title+' · '+doc.description;return p;}));document.querySelector<HTMLElement>('#records-progress')!.textContent='CLASSIFIED '+recordsState.classifiedDocumentIds.length+' / '+recordsDefinition.documents.length;document.querySelectorAll<HTMLButtonElement>('[data-archive-document]').forEach(button=>{button.hidden=recordsState.classifiedDocumentIds.includes(button.dataset['archiveDocument']??'');});}
function syncBoardEvidence(){const ids=[...state.discoveredClueIds,...discoveredInvestigationEvidenceIds,...pumpHouseState.discoveredEvidenceIds,...waterworksState.discoveredEvidenceIds];if(maintenanceYardState.regulatorCollected)ids.push('brass-regulator');if(pumpHouseState.ledgerRecovered)ids.push('crescent-order-mark');for(const id of ids)boardState=addBoardEvidence(boardState,id,boardDefinition);}
function renderBoard(){syncBoardEvidence();const reviewClockTower=document.querySelector<HTMLButtonElement>('#board-review-clocktower')!;reviewClockTower.hidden=investigationChain.locationStatus!=='searched';const list=document.querySelector<HTMLElement>('#board-evidence')!;list.replaceChildren(...boardDefinition.evidence.filter(item=>boardState.discoveredEvidenceIds.includes(item.id)).map(item=>{const button=document.createElement('button');button.type='button';button.className='board-evidence-item'+(boardState.selectedEvidenceIds.includes(item.id)?' selected':'');button.textContent=item.title;const detail=document.createElement('small');detail.textContent=item.description;button.append(detail);button.addEventListener('click',()=>{const result=selectBoardEvidence(boardState,item.id);boardState=result.state;renderBoard();});return button;}));document.querySelector<HTMLElement>('#board-connections')!.replaceChildren(...boardState.connections.map(connection=>{const p=document.createElement('p');p.className='detail-observation';p.textContent=connection.conclusion;return p;}));document.querySelector<HTMLElement>('#board-feedback')!.textContent=boardState.feedback;document.querySelector<HTMLElement>('#board-conclusion')!.hidden=!boardState.conclusionUnlocked;}
function renderPumpPanel(){document.querySelector<HTMLElement>('#pump-feedback')!.textContent=pumpHouseState.feedback;document.querySelector<HTMLButtonElement>('#pump-search')!.hidden=pumpHouseState.status!=='available';document.querySelector<HTMLElement>('#pump-mechanism')!.hidden=pumpHouseState.status!=='searched';document.querySelector<HTMLButtonElement>('#pump-recover-ledger')!.hidden=pumpHouseState.status!=='mechanism-open';document.querySelector<HTMLElement>('#pump-deduction')!.hidden=pumpHouseState.status!=='ledger-recovered'&&pumpHouseState.status!=='deduction-complete';}
function renderValePanel(){document.querySelector<HTMLElement>('#vale-response')!.textContent=valeState.feedback;document.querySelector('#vale-topics')!.replaceChildren(...valeDefinition.topics.filter(topic=>!valeState.askedTopicIds.includes(topic.id)).map(topic=>{const button=document.createElement('button');button.type='button';button.className='keeper-choice';button.textContent=topic.label;button.addEventListener('click',()=>{valeState=askValeAbout(valeState,valeDefinition,topic.id).state;renderValePanel();});return button;}));document.querySelector<HTMLButtonElement>('#vale-present-order')!.hidden=valeState.presentedEvidenceIds.includes(valeDefinition.decisiveEvidenceId);}
function closeYardDeduction(){yardDeductionPanel.hidden=true;yardDeductionPanel.style.setProperty('display','none','important');}
function renderYardPanel(){document.querySelector<HTMLElement>('#yard-feedback')!.textContent=maintenanceYardState.feedback;document.querySelector<HTMLElement>('#yard-evidence')!.replaceChildren(...maintenanceYardState.discoveredEvidenceIds.map(id=>{const item=document.createElement('p');item.className='detail-observation';item.textContent=id==='signed-work-order'?'SIGNED WORK ORDER · A torn carbon copy lists a regulator transfer. The signature is smudged, but the initials “E.V.” remain.':'MATCHING TOOL MARK · Fresh crescent-shaped scoring on the regulator bracket matches the keeper’s maintenance wrench.';return item;}));document.querySelector<HTMLButtonElement>('#yard-search')!.hidden=maintenanceYardState.status!=='available';document.querySelector<HTMLButtonElement>('#yard-open-deduction')!.hidden=maintenanceYardState.status!=='regulator-recovered';}
function openKeeperPanel(){if(keeperState.status==='unavailable')return;renderKeeperPanel();keeperPanel.hidden=false;keeperPanel.style.removeProperty('display');}
function renderKeeperPanel(){document.querySelector<HTMLElement>('#keeper-response')!.textContent=keeperState.feedback;document.querySelector('#keeper-topics')!.replaceChildren(...keeperDefinition.topics.filter(topic=>!keeperState.askedTopicIds.includes(topic.id)).map(topic=>{const button=document.createElement('button');button.type='button';button.className='keeper-choice';button.textContent=topic.label;button.addEventListener('click',()=>{const result=askKeeperAbout(keeperState,keeperDefinition,topic.id);keeperState=result.state;renderKeeperPanel();});return button;}));const present=document.querySelector<HTMLButtonElement>('#keeper-present-evidence')!;present.hidden=keeperState.presentedEvidenceIds.includes(keeperDefinition.presentedEvidenceId);}
function renderServicePuzzle(){document.querySelector<HTMLElement>('#service-puzzle-progress')!.textContent=servicePuzzleState.status==='solved'?'PANEL OPEN · 3 / 3':`${servicePuzzleState.progress} / ${servicePanelPuzzle.sequence.length} SYMBOLS · ${servicePuzzleState.mistakes} / ${servicePanelPuzzle.maxMistakes} ERRORS`;document.querySelector<HTMLElement>('#service-puzzle-feedback')!.textContent=servicePuzzleState.feedback;servicePuzzleReset.hidden=servicePuzzleState.status!=='failed';servicePuzzlePanel.querySelectorAll<HTMLButtonElement>('[data-service-symbol]').forEach(button=>{button.disabled=servicePuzzleState.status==='failed'||servicePuzzleState.status==='solved';});}
servicePuzzleButton.addEventListener('click',()=>{if(servicePuzzleState.status==='locked')return;renderServicePuzzle();servicePuzzlePanel.hidden=false;servicePuzzlePanel.style.removeProperty('display');});
document.querySelector('#service-puzzle-close')?.addEventListener('click',closeServicePuzzle);
servicePuzzlePanel.addEventListener('click',event=>{if(event.target===servicePuzzlePanel)closeServicePuzzle();});
document.querySelector('#service-puzzle-actions')?.addEventListener('click',event=>{const target=event.target;if(!(target instanceof HTMLElement))return;const button=target.closest<HTMLButtonElement>('[data-service-symbol]');if(!button)return;const symbol=button.dataset['serviceSymbol'];if(!symbol)return;const result=interactWithServicePanel(servicePuzzleState,servicePanelPuzzle,symbol,[clockTowerLocation.evidence.id]);servicePuzzleState=result.state;renderServicePuzzle();if(result.completed){discoveredInvestigationEvidenceIds=[...new Set([...discoveredInvestigationEvidenceIds,'keeper-message'])];wallMessageLeadState=revealInvestigationLead(wallMessageLeadState,wallMessageLead,[clockTowerLocation.evidence.id]);currentLead=wallMessageLead;document.querySelector<HTMLElement>('#keeper-lead')!.hidden=true;document.querySelector<HTMLElement>('#lead-title')!.textContent=wallMessageLead.title;document.querySelector<HTMLElement>('#lead-observation')!.textContent=wallMessageLead.observation;document.querySelector<HTMLElement>('#lead-objective')!.textContent=wallMessageLead.nextObjective;document.querySelector<HTMLElement>('#lead-location')!.textContent=wallMessageLead.locationHint;leadPanel.hidden=false;leadPanel.style.removeProperty('display');document.querySelector('#status')!.textContent='NEW INVESTIGATION LEAD';notify('The panel opens. A hidden message reveals another lead.');closeServicePuzzle();}else if(servicePuzzleState.status==='failed'){notify(servicePuzzleState.feedback);}});
servicePuzzleReset.addEventListener('click',()=>{servicePuzzleState=resetServicePanelPuzzle(servicePuzzleState,servicePanelPuzzle,[clockTowerLocation.evidence.id]);renderServicePuzzle();});
keeperButton.addEventListener('click',openKeeperPanel);
regulatorButton.addEventListener('click',()=>{const distance=Math.hypot(player.position.x-yardRegulator.position.x,player.position.z-yardRegulator.position.z);const result=collectYardRegulator(maintenanceYardState,maintenanceYardDefinition,distance,2.3);maintenanceYardState=result.state;if(result.accepted){yardRegulator.visible=false;regulatorButton.hidden=true;renderYardPanel();document.querySelector('#status')!.textContent='BRASS REGULATOR RECOVERED';notify('Physical evidence recovered. Compare the work order and tool mark.');}});
waterworksButton.addEventListener('click',()=>{renderWaterworksPanel();waterworksPanel.hidden=false;waterworksPanel.style.removeProperty('display');});
document.querySelector('#waterworks-close')?.addEventListener('click',closeWaterworksPanel);
waterworksPanel.addEventListener('click',event=>{if(event.target===waterworksPanel)closeWaterworksPanel();});
document.querySelector('#waterworks-search-objects')?.addEventListener('click',event=>{const target=event.target;if(!(target instanceof HTMLElement))return;const button=target.closest<HTMLButtonElement>('[data-waterworks-object]');if(!button)return;const id=button.dataset['waterworksObject'];if(!id)return;const result=searchWaterworksObject(waterworksState,waterworksDefinition,id);waterworksState=result.state;renderWaterworksPanel();if(result.accepted){syncBoardEvidence();notify(result.state.feedback);}});
document.querySelector('#waterworks-start-timeline')?.addEventListener('click',()=>{const result=beginWaterworksTimeline(waterworksState,waterworksDefinition);waterworksState=result.state;renderWaterworksPanel();});
document.querySelector('#waterworks-timeline-events')?.addEventListener('click',event=>{const target=event.target;if(!(target instanceof HTMLElement))return;const button=target.closest<HTMLButtonElement>('[data-waterworks-event]');if(!button)return;const id=button.dataset['waterworksEvent'];if(!id)return;const result=placeWaterworksTimelineEvent(waterworksState,waterworksDefinition,id);waterworksState=result.state;renderWaterworksPanel();if(result.completed)notify('The 11:17 incident timeline has been reconstructed.');});
document.querySelector('#waterworks-reveal-link')?.addEventListener('click',()=>{const result=revealWaterworksHistoricalLink(waterworksState,waterworksDefinition);waterworksState=result.state;renderWaterworksPanel();if(result.completed){boardState=addBoardEvidence(boardState,waterworksDefinition.historicalLinkEvidenceId,boardDefinition);discoveredInvestigationEvidenceIds=[...new Set([...discoveredInvestigationEvidenceIds,waterworksDefinition.historicalLinkEvidenceId])];document.querySelector('#status')!.textContent='INCIDENTS CONNECTED';notify('The old incident and the current regulator disappearance share the same modified mechanism design.');}});
recordsButton.addEventListener('click',()=>{renderRecordsPanel();recordsPanel.hidden=false;recordsPanel.style.removeProperty('display');});
document.querySelector('#records-close')?.addEventListener('click',closeRecordsPanel);
recordsPanel.addEventListener('click',event=>{if(event.target===recordsPanel)closeRecordsPanel();});
document.querySelector('#records-search')?.addEventListener('click',()=>{const r=searchRecordsOffice(recordsState,recordsDefinition);recordsState=r.state;renderRecordsPanel();if(r.accepted)notify('Three historical documents are recovered from the archive.');});
document.querySelector('#records-classification')?.addEventListener('click',event=>{const target=event.target;if(!(target instanceof HTMLElement))return;const button=target.closest<HTMLButtonElement>('[data-archive-document]');if(!button)return;const id=button.dataset['archiveDocument'];if(!id)return;const r=classifyArchiveDocument(recordsState,recordsDefinition,id);recordsState=r.state;renderRecordsPanel();if(r.completed)notify('The archive index releases a sealed historical incident file.');});
document.querySelector('#records-reveal-history')?.addEventListener('click',()=>{const r=revealHistoricalIncident(recordsState,recordsDefinition);recordsState=r.state;renderRecordsPanel();if(r.completed){discoveredInvestigationEvidenceIds=[...new Set([...discoveredInvestigationEvidenceIds,recordsDefinition.historicalEvidenceId])];boardState=addBoardEvidence(boardState,recordsDefinition.historicalEvidenceId,boardDefinition);document.querySelector('#status')!.textContent='HISTORICAL INCIDENT DISCOVERED';notify('The crescent seal appears on an authorization sheet from an earlier Hollow Creek incident.');}});
document.querySelector('#records-track-next')?.addEventListener('click',()=>{waterworksState=createWaterworksState(waterworksDefinition,['earlier-incident']);waterworksMarker.visible=true;waterworksFloor.visible=true;controlRoom.visible=true;channelGroup.visible=true;timingMechanism.visible=true;activeLead.textContent='TRACKED LEAD · Reconstruct the earlier waterworks incident and compare it with the clock tower stop time of 11:17.';activeLead.hidden=false;document.querySelector('#status')!.textContent='OLD WATERWORKS UNLOCKED';notify('The old waterworks incident site is now accessible.');closeRecordsPanel();});
boardButton.addEventListener('click',()=>{renderBoard();if(investigationChain.locationStatus==='searched'){locationButton.textContent='REVIEW CLOCK TOWER EVIDENCE';locationButton.hidden=false;}boardPanel.hidden=false;boardPanel.style.removeProperty('display');});
document.querySelector('#board-review-clocktower')?.addEventListener('click',()=>{closeBoardPanel();locationButton.textContent='REVIEW CLOCK TOWER EVIDENCE';locationPanel.hidden=false;locationPanel.style.removeProperty('display');});
document.querySelector('#board-close')?.addEventListener('click',closeBoardPanel);
boardPanel.addEventListener('click',event=>{if(event.target===boardPanel)closeBoardPanel();});
document.querySelector('#board-connect')?.addEventListener('click',()=>{const result=connectBoardEvidence(boardState,boardDefinition);boardState=result.state;renderBoard();if(result.completed){notify('Evidence chain complete. The crescent seal connects the transfer to an unknown authorizer.');document.querySelector('#status')!.textContent='EVIDENCE CHAIN COMPLETE';}});
pumpButton.addEventListener('click',()=>{if(pumpHouseState.status==='locked')return;renderPumpPanel();pumpPanel.hidden=false;pumpPanel.style.removeProperty('display');});
document.querySelector('#pump-close')?.addEventListener('click',closePumpPanel);
pumpPanel.addEventListener('click',event=>{if(event.target===pumpPanel)closePumpPanel();});
document.querySelector('#vale-track-pump-lead')?.addEventListener('click',()=>{pumpHouseState=createPumpHouseState(pumpHouseDefinition,[valeDefinition.followUpLeadId]);pumpMarker.visible=true;pumpGround.visible=true;pumpShed.visible=true;pumpWheel.visible=true;document.querySelector('#status')!.textContent='OLD PUMP HOUSE UNLOCKED';activeLead.textContent='TRACKED LEAD · Search the old pump house and recover the sealed ledger.';activeLead.hidden=false;notify('The old pump house is now accessible.');closeValePanel();});
document.querySelector('#pump-search')?.addEventListener('click',()=>{const r=searchPumpHouse(pumpHouseState,pumpHouseDefinition);pumpHouseState=r.state;renderPumpPanel();if(r.accepted)notify('You find a hidden selector and traces of blue sealing wax.');});
document.querySelector('#pump-mechanism')?.addEventListener('click',event=>{const target=event.target;if(!(target instanceof HTMLElement))return;const button=target.closest<HTMLButtonElement>('[data-pump-symbol]');if(!button)return;const symbol=button.dataset['pumpSymbol'];if(!symbol)return;const r=turnPumpHouseMechanism(pumpHouseState,pumpHouseDefinition,symbol);pumpHouseState=r.state;renderPumpPanel();});
document.querySelector('#pump-recover-ledger')?.addEventListener('click',()=>{pumpHouseState=recoverPumpHouseLedger(pumpHouseState).state;syncBoardEvidence();renderPumpPanel();pumpWheel.rotation.z=Math.PI/4;notify('The sealed ledger is recovered.');});
document.querySelector('#pump-deduction-options')?.addEventListener('click',event=>{const target=event.target;if(!(target instanceof HTMLElement))return;const button=target.closest<HTMLButtonElement>('[data-pump-deduction]');if(!button)return;const id=button.dataset['pumpDeduction'];if(!id)return;const r=submitPumpHouseDeduction(pumpHouseState,pumpHouseDefinition,id);pumpHouseState=r.state;document.querySelector<HTMLElement>('#pump-deduction-feedback')!.textContent=r.state.feedback;if(r.completed){document.querySelector('#status')!.textContent='SEALED LEDGER ANALYSED';document.querySelector<HTMLElement>('#pump-next-lead')!.hidden=false;notify('The ledger confirms a hidden authorizer using the crescent seal.');}});
document.querySelector('#pump-track-next')?.addEventListener('click',()=>{recordsState=createRecordsOfficeState(recordsDefinition,['crescent-seal']);recordsMarker.visible=true;recordsFloor.visible=true;archiveShelf.visible=true;filingCabinet.visible=true;activeLead.textContent='TRACKED LEAD · Search Hollow Creek Records Office for earlier documents bearing the crescent seal.';activeLead.hidden=false;document.querySelector('#status')!.textContent='RECORDS OFFICE UNLOCKED';notify('Hollow Creek Records Office is now accessible.');closePumpPanel();});
valeButton.addEventListener('click',()=>{if(valeState.status!=='available')return;renderValePanel();valePanel.hidden=false;valePanel.style.removeProperty('display');});
document.querySelector('#vale-close')?.addEventListener('click',closeValePanel);
valePanel.addEventListener('click',event=>{if(event.target===valePanel)closeValePanel();});
document.querySelector('#vale-present-order')?.addEventListener('click',()=>{const evidence=[...discoveredInvestigationEvidenceIds,'brass-regulator'];const result=presentEvidenceToVale(valeState,valeDefinition,valeDefinition.decisiveEvidenceId,evidence);valeState=result.state;renderValePanel();if(result.unlockedLead){document.querySelector<HTMLElement>('#vale-lead')!.hidden=false;document.querySelector<HTMLElement>('#vale-lead')!.textContent='NEW LEAD · THE SEALED LEDGER — Find the old pump house and recover the ledger Elias described.';document.querySelector<HTMLButtonElement>('#vale-track-pump-lead')!.hidden=false;document.querySelector('#status')!.textContent='SEALED LEDGER LEAD UNLOCKED';notify('Elias admits he followed someone else’s order. A new lead is revealed.');}});
yardButton.addEventListener('click',()=>{if(maintenanceYardState.status!=='available')return;renderYardPanel();yardPanel.hidden=false;yardPanel.style.removeProperty('display');});
document.querySelector('#yard-close')?.addEventListener('click',closeYardPanel);
yardPanel.addEventListener('click',event=>{if(event.target===yardPanel)closeYardPanel();});
document.querySelector('#yard-search')?.addEventListener('click',()=>{const result=searchMaintenanceYard(maintenanceYardState,maintenanceYardDefinition);maintenanceYardState=result.state;if(result.accepted){discoveredInvestigationEvidenceIds=[...new Set([...discoveredInvestigationEvidenceIds,...maintenanceYardDefinition.evidenceIds])];yardSearchMarker.visible=false;yardRegulator.visible=true;renderYardPanel();notify('The yard search reveals a brass regulator and two linked evidence items.');}});
document.querySelector('#yard-open-deduction')?.addEventListener('click',()=>{yardDeductionPanel.hidden=false;yardDeductionPanel.style.removeProperty('display');});
document.querySelector('#yard-deduction-close')?.addEventListener('click',closeYardDeduction);
yardDeductionPanel.addEventListener('click',event=>{if(event.target===yardDeductionPanel)closeYardDeduction();});
document.querySelector('#yard-deduction-options')?.addEventListener('click',event=>{const target=event.target;if(!(target instanceof HTMLElement))return;const button=target.closest<HTMLButtonElement>('[data-yard-deduction]');if(!button)return;const choice=button.dataset['yardDeduction'];if(!choice)return;const result=submitYardDeduction(maintenanceYardState,maintenanceYardDefinition,choice);maintenanceYardState=result.state;document.querySelector<HTMLElement>('#yard-deduction-feedback')!.textContent=result.state.feedback;if(result.completed){document.querySelector('#status')!.textContent='YARD DEDUCTION COMPLETE';document.querySelector<HTMLElement>('#yard-next-lead')!.hidden=false;valeState=unlockValeEncounter(valeState);yardNpc.visible=true;notify('The work order points to the keeper’s assistant, Elias Vale. Find him in the yard.');}});
document.querySelector('#yard-next-lead-track')?.addEventListener('click',()=>{activeLead.textContent='TRACKED LEAD · Find Elias Vale, the keeper’s assistant, and ask why his initials appear on the regulator transfer order.';activeLead.hidden=false;document.querySelector('#status')!.textContent='ELIAS VALE · ENCOUNTER UNLOCKED';closeYardDeduction();notify('Elias is waiting beside the maintenance shed.');});
document.querySelector('#keeper-close')?.addEventListener('click',closeKeeperPanel);
document.querySelector('#keeper-track-yard-lead')?.addEventListener('click',()=>{keeperLeadState=trackInvestigationLead(keeperLeadState);maintenanceYardState=createMaintenanceYardState(maintenanceYardDefinition,[keeperLead.id]);yardGround.visible=true;yardShed.visible=true;yardSearchMarker.visible=true;activeLead.textContent='TRACKED LEAD · '+keeperLead.title+' — '+keeperLead.nextObjective;activeLead.hidden=false;document.querySelector('#status')!.textContent='MAINTENANCE YARD UNLOCKED';notify('The old maintenance yard is now accessible.');closeKeeperPanel();});
keeperPanel.addEventListener('click',event=>{if(event.target===keeperPanel)closeKeeperPanel();});
document.querySelector('#keeper-present-evidence')?.addEventListener('click',()=>{const result=presentEvidenceToKeeper(keeperState,keeperDefinition,keeperDefinition.presentedEvidenceId,discoveredInvestigationEvidenceIds);keeperState=result.state;renderKeeperPanel();if(result.unlockedLead){keeperLeadState=revealInvestigationLead(keeperLeadState,keeperLead,['keeper-message']);document.querySelector<HTMLElement>('#keeper-lead')!.hidden=false;document.querySelector<HTMLElement>('#keeper-lead')!.textContent='NEW LEAD · '+keeperLead.title+' — '+keeperLead.nextObjective;document.querySelector<HTMLButtonElement>('#keeper-track-yard-lead')!.hidden=false;document.querySelector('#status')!.textContent='NEW LEAD · MISSING REGULATOR';notify('The keeper has identified what was moved. A new lead is unlocked.');}});
locationSearchButton.addEventListener('click',()=>{const result=searchInvestigationLocation(investigationChain,clockTowerLocation.id,clockTowerLocation);investigationChain=result.state;if(result.accepted){discoveredInvestigationEvidenceIds=[...new Set([...discoveredInvestigationEvidenceIds,clockTowerLocation.evidence.id])];}if(!result.accepted){notify('This location has already been searched.');return;}document.querySelector<HTMLElement>('#location-evidence-title')!.textContent=clockTowerLocation.evidence.title;document.querySelector<HTMLElement>('#location-evidence-description')!.textContent=clockTowerLocation.evidence.description;document.querySelector<HTMLElement>('#location-evidence')!.hidden=false;document.querySelector<HTMLElement>('#followup-puzzle')!.hidden=false;servicePuzzleState=createServicePanelPuzzleState(servicePanelPuzzle,[clockTowerLocation.evidence.id]);servicePuzzleButton.hidden=false;document.querySelector<HTMLElement>('#followup-puzzle')!.textContent='NEW PUZZLE UNLOCKED · '+clockTowerLocation.followUpPuzzleTitle;locationSearchButton.hidden=true;locationButton.textContent='REVIEW CLOCK TOWER EVIDENCE';locationButton.hidden=false;activeLead.textContent='EVIDENCE FOUND · '+clockTowerLocation.evidence.title+' — '+clockTowerLocation.evidence.description;document.querySelector('#status')!.textContent='FOLLOW-UP PUZZLE UNLOCKED';notify(investigationChain.feedback);closeLocationPanel();});
leadTrackButton.addEventListener('click',()=>{leadReviewButton.hidden=true;if(currentLead.id===wallMessageLead.id){wallMessageLeadState=trackInvestigationLead(wallMessageLeadState);keeperState=unlockKeeperEncounter(keeperState);keeperNpc.visible=true;activeLead.textContent='TRACKED LEAD · '+wallMessageLead.title+' — '+wallMessageLead.nextObjective;document.querySelector('#status')!.textContent='KEEPER ENCOUNTER UNLOCKED';notify('The keeper is waiting near the tower lane.');}else if(currentLead.id===relicLead.id){leadState=trackInvestigationLead(leadState);investigationChain=unlockInvestigationLocation(investigationChain,[relicLead.id],clockTowerLocation);activeLead.textContent='NEXT LEAD · '+relicLead.title+' — '+relicLead.nextObjective;locationButton.hidden=false;document.querySelector('#status')!.textContent='NEW LOCATION UNLOCKED';notify(investigationChain.feedback);}else{wallMessageLeadState=trackInvestigationLead(wallMessageLeadState);activeLead.textContent='TRACKED LEAD · '+wallMessageLead.title+' — '+wallMessageLead.nextObjective;document.querySelector('#status')!.textContent='FOLLOW-UP LEAD TRACKED';notify(wallMessageLeadState.feedback);}activeLead.hidden=false;closeLeadPanel();});
relicButton.addEventListener('click',()=>{const distance=Math.hypot(player.position.x-hiddenRelic.getWorldPosition(new THREE.Vector3()).x,player.position.z-hiddenRelic.getWorldPosition(new THREE.Vector3()).z);const result=collectRelic(relicState,fountainRelic,distance,relicRange);relicState=result.state;if(result.collected){hiddenRelic.visible=false;relicButton.hidden=true;relicInventory.hidden=false;relicInventory.textContent='✦ '+fountainRelic.name;leadState=revealInvestigationLead(leadState,relicLead,[fountainRelic.id]);document.querySelector<HTMLElement>('#lead-title')!.textContent=relicLead.title;document.querySelector<HTMLElement>('#lead-observation')!.textContent=relicLead.observation;document.querySelector<HTMLElement>('#lead-objective')!.textContent=relicLead.nextObjective;document.querySelector<HTMLElement>('#lead-location')!.textContent=relicLead.locationHint;leadPanel.hidden=false;leadPanel.style.removeProperty('display');leadReviewButton.hidden=false;notify(fountainRelic.name+' recovered. Review and pin the new lead to unlock the Clock Tower.');}else{notify(result.state.feedback);}});
const deductionPanel=document.querySelector<HTMLElement>('#deduction-panel')!;
const deductionOptions=document.querySelector<HTMLElement>('#deduction-options')!;
const deductionFeedback=document.querySelector<HTMLElement>('#deduction-feedback')!;
let selectedDeduction='';let deductionSolved=false;
function closeDeduction(){deductionPanel.hidden=true;deductionPanel.style.setProperty('display','none','important');}
document.querySelector('#deduction-open')?.addEventListener('click',()=>{if(state.discoveredClueIds.length<3){notify('Collect all three clues first.');return;}deductionOptions.replaceChildren(...prototypeDeductionOptions.map(option=>{const button=document.createElement('button');button.type='button';button.className='deduction-option';button.dataset['optionId']=option.id;button.textContent=option.title;const detail=document.createElement('small');detail.textContent=option.explanation;button.append(detail);button.addEventListener('click',()=>{if(deductionSolved)return;selectedDeduction=option.id;deductionOptions.querySelectorAll('.deduction-option').forEach(node=>node.classList.remove('selected'));button.classList.add('selected');const result=evaluatePrototypeDeduction(state.discoveredClueIds,selectedDeduction);deductionFeedback.textContent=result.feedback;if(result.correct){deductionSolved=true;deductionFeedback.textContent+=' Case exercise complete.';document.querySelector('#status')!.textContent='DEDUCTION COMPLETE';closeDeduction();const resultPanel=document.querySelector<HTMLElement>('#case-result')!;resultPanel.hidden=false;resultPanel.style.removeProperty('display');notify('Your deduction is supported by the evidence.');}});return button;}));deductionFeedback.textContent='';deductionPanel.hidden=false;deductionPanel.style.removeProperty('display');});
document.querySelector('#deduction-close')?.addEventListener('click',closeDeduction);
deductionPanel.addEventListener('click',event=>{if(event.target===deductionPanel)closeDeduction();});
const caseResult=document.querySelector<HTMLElement>('#case-result')!;
const replayConfirm=document.querySelector<HTMLElement>('#replay-confirm')!;
const closeReplayConfirm=()=>{replayConfirm.hidden=true;replayConfirm.style.setProperty('display','none','important');};
document.querySelector('#continue-case')?.addEventListener('click',()=>{caseResult.hidden=true;caseResult.style.setProperty('display','none','important');});
document.querySelector('#replay-case')?.addEventListener('click',()=>{replayConfirm.hidden=false;replayConfirm.style.removeProperty('display');});
document.querySelector('#replay-cancel')?.addEventListener('click',closeReplayConfirm);
document.querySelector('#replay-confirm-yes')?.addEventListener('click',()=>{closeReplayConfirm();caseResult.hidden=true;caseResult.style.removeProperty('display');closeEvidenceDetail();closeDeduction();detailTitle.textContent='';detailDescription.textContent='';state=initialState;deductionSolved=false;selectedDeduction='';fountainPuzzleState=createPuzzleState(fountainPuzzle);compartmentOpen=false;compartmentReveal=0;lidHinge.rotation.x=0;hiddenRelic.visible=false;relicLight.intensity=0;relicState=createRelicState(fountainRelic);leadState=createInvestigationLeadState();wallMessageLeadState=createInvestigationLeadState();keeperLeadState=createInvestigationLeadState();keeperState=createKeeperEncounterState();valeState=createValeEncounterState();valeButton.hidden=true;closeValePanel();pumpHouseState=createPumpHouseState(pumpHouseDefinition);boardState=createInvestigationBoardState();recordsState=createRecordsOfficeState(recordsDefinition);waterworksState=createWaterworksState(waterworksDefinition);waterworksButton.hidden=true;waterworksMarker.visible=false;waterworksFloor.visible=false;controlRoom.visible=false;channelGroup.visible=false;timingMechanism.visible=false;closeWaterworksPanel();recordsButton.hidden=true;recordsMarker.visible=false;recordsFloor.visible=false;archiveShelf.visible=false;filingCabinet.visible=false;closeRecordsPanel();boardButton.hidden=false;closeBoardPanel();pumpButton.hidden=true;pumpMarker.visible=false;pumpGround.visible=false;pumpShed.visible=false;pumpWheel.visible=false;closePumpPanel();discoveredInvestigationEvidenceIds=[];yardRegulator.visible=false;yardNpc.visible=false;yardSearchMarker.visible=false;yardGround.visible=false;yardShed.visible=false;keeperNpc.visible=false;keeperButton.hidden=true;closeKeeperPanel();currentLead=relicLead;servicePuzzleState=createServicePanelPuzzleState(servicePanelPuzzle);investigationChain=createInvestigationChainState();closeLeadPanel();closeServicePuzzle();servicePuzzleButton.hidden=true;closeLocationPanel();locationButton.hidden=true;document.querySelector<HTMLElement>('#location-evidence')!.hidden=true;document.querySelector<HTMLElement>('#followup-puzzle')!.hidden=true;locationSearchButton.hidden=false;locationMarker.visible=false;activeLead.hidden=true;activeLead.textContent='';leadReviewButton.hidden=true;relicButton.hidden=true;relicInventory.hidden=true;relicInventory.textContent='';closePuzzle();document.querySelector<HTMLButtonElement>('#puzzle-open')!.hidden=true;clueMeshes.forEach(mesh=>{mesh.visible=true;});document.querySelector('#count')!.textContent='0';document.querySelector('#evidence')!.textContent='Your evidence journal is empty.';document.querySelector<HTMLButtonElement>('#deduction-open')!.hidden=true;document.querySelector('#status')!.textContent='INVESTIGATION IN PROGRESS';const hint=document.querySelector<HTMLElement>('#hint')!;hint.style.display='';hint.textContent='EXPLORE THE SQUARE TO FIND CLUES';deductionFeedback.textContent='';player.position.set(0,0,5.2);cameraYaw=0;notify('Investigation restarted. Find all three clues.');});
const caseToggle=document.querySelector<HTMLButtonElement>('#case-toggle');
caseToggle?.addEventListener('click',()=>{
 const open=document.querySelector<HTMLElement>('#app')?.classList.toggle('case-open')??false;
 caseToggle.setAttribute('aria-expanded',String(open));
 caseToggle.textContent=open?'CLOSE CASE':'CASE · '+(document.querySelector('#count')?.textContent??'0')+'/3';
});
const caseCount=document.querySelector('#count');
if(caseCount&&caseToggle){new MutationObserver(()=>{if(!document.querySelector<HTMLElement>('#app')?.classList.contains('case-open'))caseToggle.textContent='CASE · '+(caseCount.textContent??'0')+'/3';}).observe(caseCount,{childList:true,characterData:true,subtree:true});}
const joystick=document.querySelector<HTMLElement>('#joystick');const stick=document.querySelector<HTMLElement>('#stick');const move={x:0,y:0};let joystickPointer:number|null=null;
function updateJoystick(e:PointerEvent){if(!joystick||!stick)return;const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width*.34,dx=e.clientX-cx,dy=e.clientY-cy,len=Math.hypot(dx,dy),scale=len>max?max/len:1;move.x=dx*scale/max;move.y=dy*scale/max;stick.style.transform=`translate(${move.x*max}px,${move.y*max}px)`;}
joystick?.addEventListener('pointerdown',e=>{e.preventDefault();joystickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);updateJoystick(e);});
function trackJoystickPointer(e:PointerEvent){if(e.pointerId===joystickPointer)updateJoystick(e);}
function resetJoystickInput(){joystickPointer=null;move.x=0;move.y=0;if(stick)stick.style.transform='translate(0,0)';}
function releaseJoystick(e:PointerEvent){if(e.pointerId!==joystickPointer)return;resetJoystickInput();}
window.addEventListener('pointermove',trackJoystickPointer,{passive:false});
window.addEventListener('pointerup',releaseJoystick);
window.addEventListener('pointercancel',releaseJoystick);
window.addEventListener('blur',resetJoystickInput);
const locationMarker=new THREE.Mesh(new THREE.OctahedronGeometry(.3),new THREE.MeshStandardMaterial({color:'#e6c98f',emissive:'#b18a50',emissiveIntensity:1.8}));locationMarker.position.set(1,-.0,-7.75);locationMarker.visible=false;scene.add(locationMarker);const yardGround=new THREE.Mesh(new THREE.PlaneGeometry(7,5),new THREE.MeshStandardMaterial({color:'#394437',roughness:1}));yardGround.rotation.x=-Math.PI/2;yardGround.position.set(2.8,-.04,-5.5);yardGround.visible=false;scene.add(yardGround);const yardShed=new THREE.Mesh(new THREE.BoxGeometry(2.1,1.8,1.5),new THREE.MeshStandardMaterial({color:'#514b3c',roughness:1}));yardShed.position.set(4.5,.9,-6.4);yardShed.visible=false;scene.add(yardShed);const yardNpc=new THREE.Group();const yardNpcBody=new THREE.Mesh(new THREE.CapsuleGeometry(.25,.65,4,8),new THREE.MeshStandardMaterial({color:'#6d5140'}));yardNpcBody.position.y=.65;yardNpc.add(yardNpcBody);const yardNpcHead=new THREE.Mesh(new THREE.SphereGeometry(.2,10,8),new THREE.MeshStandardMaterial({color:'#bd9678'}));yardNpcHead.position.y=1.25;yardNpc.add(yardNpcHead);yardNpc.position.set(3.8,0,-4.7);yardNpc.visible=false;scene.add(yardNpc);const yardSearchMarker=new THREE.Mesh(new THREE.OctahedronGeometry(.28),new THREE.MeshStandardMaterial({color:'#9ac6a0',emissive:'#477d55',emissiveIntensity:1.4}));yardSearchMarker.position.set(1.7,.35,-5.6);yardSearchMarker.visible=false;scene.add(yardSearchMarker);const yardRegulator=new THREE.Group();const regulatorWheel=new THREE.Mesh(new THREE.TorusGeometry(.48,.09,8,20),new THREE.MeshStandardMaterial({color:'#b58b43',metalness:.8,roughness:.3}));regulatorWheel.rotation.x=Math.PI/2;yardRegulator.add(regulatorWheel);const regulatorHub=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.18,12),new THREE.MeshStandardMaterial({color:'#d1ad62',metalness:.8}));regulatorHub.position.y=.05;yardRegulator.add(regulatorHub);yardRegulator.position.set(2.5,.55,-6.1);yardRegulator.visible=false;scene.add(yardRegulator);const keeperNpc=new THREE.Group();const keeperCoat=new THREE.Mesh(new THREE.CapsuleGeometry(.3,.78,4,8),new THREE.MeshStandardMaterial({color:'#53606c',roughness:.9}));keeperCoat.position.y=.78;keeperNpc.add(keeperCoat);const keeperHead=new THREE.Mesh(new THREE.SphereGeometry(.24,12,10),new THREE.MeshStandardMaterial({color:'#c79c7a'}));keeperHead.position.y=1.48;keeperNpc.add(keeperHead);const keeperHat=new THREE.Mesh(new THREE.CylinderGeometry(.25,.28,.12,12),new THREE.MeshStandardMaterial({color:'#252b36'}));keeperHat.position.y=1.72;keeperNpc.add(keeperHat);keeperNpc.position.set(-2.1,0,-7.1);keeperNpc.visible=false;scene.add(keeperNpc);let cameraYaw=0;let lookPointer:number|null=null;let lookStartX=0;let lookStartY=0;let lastLookX=0;let lookMoved=false;
renderer.domElement.addEventListener('pointerdown',e=>{if(joystickPointer!==null||e.target!==renderer.domElement)return;lookPointer=e.pointerId;lookStartX=e.clientX;lookStartY=e.clientY;lastLookX=e.clientX;lookMoved=false;renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(joystickPointer!==null||e.pointerId!==lookPointer)return;const total=Math.hypot(e.clientX-lookStartX,e.clientY-lookStartY);if(total>7)lookMoved=true;if(lookMoved){cameraYaw-=(e.clientX-lastLookX)*.008;}lastLookX=e.clientX;});
function endLook(e:PointerEvent){if(e.pointerId!==lookPointer)return;if(!lookMoved)inspect(e.clientX,e.clientY);lookPointer=null;}
renderer.domElement.addEventListener('pointerup',endLook);renderer.domElement.addEventListener('pointercancel',endLook);
function resize(){const w=Math.max(1,sceneRoot.clientWidth),h=Math.max(1,sceneRoot.clientHeight);camera.aspect=w/h;camera.fov=w/h<.85?60:48;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
const observer=new ResizeObserver(resize);observer.observe(sceneRoot);resize();
const clock=new THREE.Clock();let frame=0;let walkTime=0;let gamePaused=false;let gameInteractable=false;
const blockUnavailableInput=(event:Event)=>{if(gamePaused||!gameInteractable){event.preventDefault();event.stopImmediatePropagation();}};
for(const eventName of ['pointerdown','pointerup','pointermove','click','keydown'])document.addEventListener(eventName,blockUnavailableInput,true);
function animate(){if(gamePaused)return;frame=requestAnimationFrame(animate);sceneRoot.dataset['animationFrames']=String(Number(sceneRoot.dataset['animationFrames']??0)+1);const playerWorldAtFrameStart=player.getWorldPosition(new THREE.Vector3());sceneRoot.dataset['playerX']=playerWorldAtFrameStart.x.toFixed(3);sceneRoot.dataset['playerZ']=playerWorldAtFrameStart.z.toFixed(3);sceneRoot.dataset['movementX']=move.x.toFixed(3);sceneRoot.dataset['movementY']=move.y.toFixed(3);sceneRoot.dataset['gamePaused']=String(gamePaused);sceneRoot.dataset['gameInteractable']=String(gameInteractable);sceneRoot.dataset['arrivalCarX']=arrivalCar.position.x.toFixed(2);sceneRoot.dataset['stormActive']=String(stormStarted);const frameDelta=clock.getDelta(),dt=Math.min(frameDelta,.05),movementDt=Math.min(frameDelta,.25),t=clock.elapsedTime;sceneRoot.dataset['frameDelta']=frameDelta.toFixed(3);sceneRoot.dataset['playerReady']=String(!playArrivalSequence||t>=23.5);
if(playArrivalSequence){
  // The sedan enters from the player-facing side, crosses the foreground horizontally,
  // then turns toward the fountain. The town gates are never used as a vehicle entrance.
  if(t<5){setDriveRoute(driveRoutes.approach);applySedanPhysics(dt,3.25,5.5,4.6,true);headlampLeft.intensity=headlampRight.intensity=2.8;}
  else if(t<16){setDriveRoute(driveRoutes.dropoff);applySedanPhysics(dt,4.0,-4.3,3.2,true);headlampLeft.intensity=headlampRight.intensity=2.4;}
  else if(t<32.2){setDriveRoute(driveRoutes.dropoff);
    // Park outside the fountain's expanded collision footprint; the sedan's full body stays clear.
    applySedanPhysics(dt,4.0,-4.3,0,true);
    headlampLeft.intensity=THREE.MathUtils.damp(headlampLeft.intensity,.7,2,dt);
    headlampRight.intensity=headlampLeft.intensity;
  }
  if(t>=16&&t<16.8){driverDoorPivot.rotation.y=THREE.MathUtils.damp(driverDoorPivot.rotation.y,-1.18,7,dt);}
  if(t>=16.8&&t<17&&!arrivalDriver.root.userData['exited']){
    arrivalCar.updateMatrixWorld(true);scene.attach(arrivalDriver.root);arrivalDriver.root.scale.setScalar(1);
    // Reveal the driver only after the body has cleared the cabin, at the real door threshold.
    const doorThreshold=arrivalDoorWorld(-.1,1.02);
    arrivalDriver.root.position.copy(doorThreshold);driverExitStart.copy(doorThreshold);arrivalDriver.root.userData['arrivalVelocity']=new THREE.Vector3();arrivalDriver.root.visible=true;
    arrivalDriver.root.userData['exited']=true;
  }
  if(t>=17&&t<19.8){
    const reached=moveArrivalActor(arrivalDriver.root,new THREE.Vector3(4.15,0,-3.35),dt,1.65);
    const stride=(arrivalDriver.root.userData['arrivalVelocity'] as THREE.Vector3).length();
    arrivalDriver.leftLeg.rotation.x=Math.sin(t*7)*Math.min(.28,stride*.16);arrivalDriver.rightLeg.rotation.x=-arrivalDriver.leftLeg.rotation.x;
    arrivalDriver.leftArm.rotation.x=-.18;arrivalDriver.rightArm.rotation.x=-.18;
    if(reached){arrivalDriver.leftLeg.rotation.x=0;arrivalDriver.rightLeg.rotation.x=0;}
  }
  if(t>=19&&t<20){passengerDoorPivot.rotation.y=THREE.MathUtils.damp(passengerDoorPivot.rotation.y,1.22,7,dt);}
  if(t>=20&&t<20.2&&!player.userData['exitedPassenger']){
    arrivalCar.updateMatrixWorld(true);scene.attach(player);player.scale.setScalar(1);
    // Step down at the passenger-side sill; the rig remains ground-aligned and collision-aware.
    player.position.copy(arrivalDoorWorld(-.18,-1.02));player.position.y=0;
    player.userData['arrivalVelocity']=new THREE.Vector3();player.visible=true;player.userData['exitedPassenger']=true;
  }
  if(t>=20.2&&t<23.8){
    const exitTarget=arrivalDoorWorld(-.18,-2.15);
    const reached=moveArrivalActor(player,exitTarget,dt,1.35);
    const stride=(player.userData['arrivalVelocity'] as THREE.Vector3).length();
    leftLeg.rotation.x=Math.sin(t*7)*Math.min(.3,stride*.2);rightLeg.rotation.x=-leftLeg.rotation.x;
    leftArm.rotation.x=-Math.sin(t*7)*Math.min(.16,stride*.11);rightArm.rotation.x=-leftArm.rotation.x;
    if(reached){leftLeg.rotation.x=0;rightLeg.rotation.x=0;leftArm.rotation.x=0;rightArm.rotation.x=0;}
  }
  if(t>=23&&t<23.5){passengerDoorPivot.rotation.y=THREE.MathUtils.damp(passengerDoorPivot.rotation.y,0,7,dt);leftLeg.rotation.x=0;rightLeg.rotation.x=0;leftArm.rotation.x=0;rightArm.rotation.x=0;}
  if(t>=23&&!arrivalSequenceStarted){arrivalSequenceStarted=true;arrivalDialogue.textContent='WELCOME TO HOLLOW CREEK';arrivalDialogue.style.display='block';}
  if(t>=24&&t<28){
    arrivalDogs.forEach((dog,i)=>{dog.visible=true;const angle=[Math.PI,0,-Math.PI/2,Math.PI/2][i]!;const targetX=player.position.x+Math.cos(angle)*1.65;const targetZ=player.position.z+Math.sin(angle)*1.65;const reached=moveArrivalActor(dog,new THREE.Vector3(targetX,0,targetZ),dt,2.35);const dogSpeed=(dog.userData['arrivalVelocity'] as THREE.Vector3).length();dog.children[1]!.position.y=.72+Math.abs(Math.sin(t*12+i*1.7))*.12;for(const legIndex of [5,6,7,8]){const leg=dog.children[legIndex];if(leg)leg.rotation.z=reached?0:Math.sin(t*13+i+legIndex)*Math.min(.38,dogSpeed*.2);}});
    if(!dogsBarking){dogsBarking=true;arrivalDialogue.textContent='WOOF!  WOOF!  WOOF!';for(let bark=0;bark<8;bark++)window.setTimeout(()=>{void gameAudio.playDogBark();},bark*260);}
  }
  if(t>=28&&!driverReentered){
    if(!driverReturnStarted){driverReturnStart.copy(arrivalDriver.root.position);driverReturnStarted=true;arrivalDriver.root.userData['arrivalVelocity']=new THREE.Vector3();}
    // Walk around the rear corner, stay outside the sedan's collision footprint,
    // then approach through the driver's door aperture instead of cutting through the body.
    const returnTargets=[arrivalDoorWorld(1.0,1.1),arrivalDoorWorld(-.1,1.1),arrivalDoorWorld(-.1,1.08)];
    const target=returnTargets[driverReturnPhase]??returnTargets[2]!;
    const reached=moveArrivalActor(arrivalDriver.root,target,dt,1.45);
    if(reached&&driverReturnPhase<2){driverReturnPhase++;(arrivalDriver.root.userData['arrivalVelocity'] as THREE.Vector3).set(0,0,0);}
    if(reached&&driverReturnPhase===2)driverReturnReached=true;
    const stride=(arrivalDriver.root.userData['arrivalVelocity'] as THREE.Vector3).length();
    arrivalDriver.leftLeg.rotation.x=Math.sin(t*7)*Math.min(.25,stride*.17);arrivalDriver.rightLeg.rotation.x=-arrivalDriver.leftLeg.rotation.x;
    if(driverReturnReached){arrivalDriver.leftLeg.rotation.x=0;arrivalDriver.rightLeg.rotation.x=0;}
  }
  if(t>=30.7&&driverReturnReached&&!driverReentered){
    // Boarding is gated by a confirmed arrival at the open driver's door.
    arrivalCar.updateMatrixWorld(true);arrivalCar.attach(arrivalDriver.root);arrivalDriver.root.position.set(-.1,0,1.08);arrivalDriver.root.rotation.y=Math.PI/2;arrivalDriver.root.userData['arrivalVelocity']=new THREE.Vector3();driverReentered=true;
  }
  if(driverReentered&&t<34){
    const seatProgress=THREE.MathUtils.smoothstep(t,30.7,31.45);
    arrivalDriver.root.position.lerp(new THREE.Vector3(-.1,0,.38),1-Math.exp(-dt*5.5));
    arrivalDriver.root.rotation.y=THREE.MathUtils.damp(arrivalDriver.root.rotation.y,Math.PI/2,7,dt);
    if(seatProgress>.98){arrivalDriver.root.position.set(-.1,0,.38);arrivalDriver.root.visible=false;}
    if(t>31.5)driverDoorPivot.rotation.y=THREE.MathUtils.damp(driverDoorPivot.rotation.y,0,7,dt);
  }
  if(t>=32.2&&driverReentered){
    // Departure cannot start until the driver is seated and the door is closed.
    setDriveRoute(driveRoutes.departure);applySedanPhysics(dt,3.2,12.5,4.8,true);
    headlampLeft.intensity=THREE.MathUtils.damp(headlampLeft.intensity,2.2,1.4,dt);headlampRight.intensity=headlampLeft.intensity;
  }
  if(t>=41&&!arrivalSequenceComplete){arrivalSequenceComplete=true;arrivalDialogue.style.display='none';arrivalDogs.forEach(dog=>dog.visible=true);arrivalCar.visible=false;}
}if(!stormStarted){stormStarted=true;rain.material.opacity=.82;stormFog.density=.043;}
if(stormStarted){const rainAttribute=rainGeometry.getAttribute('position') as THREE.BufferAttribute;for(let i=0;i<rainCount;i++){rainPositions[i*3+1]=(rainPositions[i*3+1]??0)-dt*13;if((rainPositions[i*3+1]??0)<0){rainPositions[i*3+1]=10+Math.random()*3;rainPositions[i*3]=(Math.random()-.5)*22;rainPositions[i*3+2]=(Math.random()-.5)*24;}}rainAttribute.needsUpdate=true;
if(t>=nextLightningAt){makeLightning();lightningGroup.visible=true;lightningFlash.intensity=5.5;lightningOffAt=t+.16;nextLightningAt=t+3.2+Math.random()*3.2;void gameAudio.playThunder();}
if(t>=lightningOffAt){lightningGroup.visible=false;lightningFlash.intensity=THREE.MathUtils.damp(lightningFlash.intensity,0,18,dt);}
}
const forward=new THREE.Vector3(-Math.sin(cameraYaw),0,-Math.cos(cameraYaw)),right=new THREE.Vector3(Math.cos(cameraYaw),0,-Math.sin(cameraYaw));sceneRoot.dataset['cameraYaw']=cameraYaw.toFixed(4);const playerCanMove=!playArrivalSequence||t>=23.5;const playerWorldPosition=player.getWorldPosition(new THREE.Vector3());const direction=playerCanMove?forward.clone().multiplyScalar(-move.y).add(right.multiplyScalar(move.x)):new THREE.Vector3();if(playerCanMove&&direction.lengthSq()>.001){direction.normalize();const speed=3.1,nx=THREE.MathUtils.clamp(playerWorldPosition.x+direction.x*speed*movementDt,-5.5,5.5),nz=THREE.MathUtils.clamp(playerWorldPosition.z+direction.z*speed*movementDt,-10.2,6.5);// Resolve movement per axis so a circular obstacle can be skirted instead
// of freezing the player whenever the diagonal step intersects its boundary.
const clearAt=(x:number,z:number)=>Math.hypot(x,z+2.8)>1.95;
const canMoveX=clearAt(nx,playerWorldPosition.z);
const canMoveZ=clearAt(canMoveX?nx:playerWorldPosition.x,nz);
if(canMoveX||canMoveZ){
  // nx/nz are world-space coordinates. Convert the destination back into the
  // character parent's local space before assigning Object3D.position.
  // This keeps locomotion correct both in the scene and while parented to
  // the sedan during the authored arrival sequence.
  const desiredWorldPosition=new THREE.Vector3(
    canMoveX?nx:playerWorldPosition.x,
    playerWorldPosition.y,
    canMoveZ?nz:playerWorldPosition.z
  );
  if(player.parent){
    player.parent.updateWorldMatrix(true,false);
    player.parent.worldToLocal(desiredWorldPosition);
  }
  player.position.x=desiredWorldPosition.x;
  player.position.z=desiredWorldPosition.z;
}
const collisionClear=canMoveX||canMoveZ;
sceneRoot.dataset['collisionClear']=String(collisionClear);player.rotation.y=Math.atan2(direction.x,direction.z);walkTime+=dt*10;player.position.y=Math.abs(Math.sin(walkTime*2))*.045;const swing=Math.sin(walkTime)*.48;leftLeg.rotation.x=swing;rightLeg.rotation.x=-swing;leftArm.rotation.x=-swing*.72;rightArm.rotation.x=swing*.72;}else if(playerCanMove){player.position.y=0;leftLeg.rotation.x=THREE.MathUtils.damp(leftLeg.rotation.x,0,12,dt);rightLeg.rotation.x=THREE.MathUtils.damp(rightLeg.rotation.x,0,12,dt);leftArm.rotation.x=THREE.MathUtils.damp(leftArm.rotation.x,0,12,dt);rightArm.rotation.x=THREE.MathUtils.damp(rightArm.rotation.x,0,12,dt);}if(playerCanMove){for(const mesh of clueMeshes){if(!mesh.visible)continue;const id=mesh.userData['clueId'];if(typeof id!=='string'||state.discoveredClueIds.includes(id))continue;if(Math.hypot(playerWorldPosition.x-mesh.position.x,playerWorldPosition.z-mesh.position.z)<=.92)collectClue(mesh);}}compartmentReveal=THREE.MathUtils.damp(compartmentReveal,compartmentOpen?1:0,3.2,dt);lidHinge.rotation.x=-compartmentReveal*1.28;hiddenRelic.position.y=.1+Math.sin(t*2.4)*.035;relicLight.intensity=compartmentReveal*1.7;const playerWorld=player.getWorldPosition(new THREE.Vector3());const arrivalShot=playArrivalSequence&&t<41;const distance=arrivalShot?10.4:5.8,height=arrivalShot?5.1:2.75;const cameraFocus=arrivalShot?new THREE.Vector3(playerWorld.x*.72,playerWorld.y+1.45,playerWorld.z-1.05):new THREE.Vector3(playerWorld.x,playerWorld.y+1.38,playerWorld.z);const desired=new THREE.Vector3(cameraFocus.x+Math.sin(cameraYaw)*distance,cameraFocus.y+height,cameraFocus.z+Math.cos(cameraYaw)*distance);camera.position.lerp(desired,1-Math.exp(-dt*(arrivalShot?2.8:5)));camera.lookAt(cameraFocus);const relicWorld=hiddenRelic.getWorldPosition(new THREE.Vector3());const relicDistance=Math.hypot(player.position.x-relicWorld.x,player.position.z-relicWorld.z);relicButton.hidden=relicState.status!=='available'||relicDistance>relicRange;locationMarker.visible=investigationChain.locationStatus!=='locked';locationMarker.rotation.y=t*.8;const locationDistance=Math.hypot(player.position.x-locationMarker.position.x,player.position.z-locationMarker.position.z);locationButton.hidden=investigationChain.locationStatus==='locked'||(investigationChain.locationStatus==='unlocked'&&locationDistance>2.5);const keeperDistance=Math.hypot(player.position.x-keeperNpc.position.x,player.position.z-keeperNpc.position.z);keeperButton.hidden=keeperState.status==='unavailable'||keeperDistance>2.8;const valeDistance=Math.hypot(player.position.x-yardNpc.position.x,player.position.z-yardNpc.position.z);valeButton.hidden=valeState.status!=='available'||valeDistance>2.8;const pumpDistance=Math.hypot(player.position.x-pumpMarker.position.x,player.position.z-pumpMarker.position.z);pumpButton.hidden=pumpHouseState.status==='locked'||pumpDistance>2.8;const recordsDistance=Math.hypot(player.position.x-recordsMarker.position.x,player.position.z-recordsMarker.position.z);recordsButton.hidden=recordsState.status==='locked'||recordsDistance>2.8;const waterworksDistance=Math.hypot(player.position.x-waterworksMarker.position.x,player.position.z-waterworksMarker.position.z);waterworksButton.hidden=waterworksState.status==='locked'||waterworksDistance>2.8;waterworksMarker.rotation.y=t*.65;timingGear.rotation.z=Math.sin(t*.8)*.12;recordsMarker.rotation.y=t*.7;pumpMarker.rotation.y=t*.8;pumpWheel.rotation.x=t*.5;const yardDistance=Math.hypot(player.position.x-yardSearchMarker.position.x,player.position.z-yardSearchMarker.position.z);yardButton.hidden=maintenanceYardState.status!=='available'||yardDistance>2.8;const regulatorDistance=Math.hypot(player.position.x-yardRegulator.position.x,player.position.z-yardRegulator.position.z);regulatorButton.hidden=maintenanceYardState.status!=='searched'||regulatorDistance>2.3;yardSearchMarker.rotation.y=t*.7;yardRegulator.rotation.y=t*.4;const hint=document.querySelector<HTMLElement>('#hint');if(hint&&state.discoveredClueIds.length<3){let nearest:THREE.Mesh|undefined;let nearestDistance=Infinity;for(const mesh of clueMeshes){const id=mesh.userData['clueId'];if(typeof id!=='string'||state.discoveredClueIds.includes(id))continue;const distance=Math.hypot(player.position.x-mesh.position.x,player.position.z-mesh.position.z);if(distance<nearestDistance){nearest=mesh;nearestDistance=distance;}}hint.textContent=nearest&&nearestDistance<=3.1?'NEARBY: TAP THE GLOWING CLUE':'EXPLORE THE SQUARE TO FIND CLUES';}clueMeshes.forEach((mesh,i)=>{mesh.rotation.y=t*.7+i;mesh.position.y=positions[i]![1]+Math.sin(t*1.8+i*1.7)*.12;});stealthEscape.update(dt,t);supernaturalAtmosphere.update(dt,t);renderer.render(scene,camera);if(!firstFrameNotified){firstFrameNotified=true;playablesPlatform.notifyFirstFrameReady();notifyReadyWhenPossible();}}

const playablesPlatform=new PlayablesPlatform();
const gameAudio=new GameAudio(playablesPlatform.audioEnabled);
let lastSubmittedScore=0;
let firstFrameNotified=false;
let persistenceReady=false;
let gameReadyNotified=false;
function notifyReadyWhenPossible(){if(firstFrameNotified&&persistenceReady&&!gameInteractable){const loadingScreen=document.querySelector<HTMLElement>('#playables-loading');if(loadingScreen)loadingScreen.hidden=true;gameInteractable=true;gameReadyNotified=true;playablesPlatform.notifyGameReady();}}
const gamePersistence=new GamePersistence(playablesPlatform,typeof window!=='undefined'?window.localStorage:undefined);
let currentSave:import('./domain/game-save').GameSaveData|undefined;
let saveQueue:Promise<void>=Promise.resolve();
let saveTimer=0;
function captureRuntimeSave():import('./domain/game-save').GameSaveData{
 if(!currentSave)throw new Error('Cannot capture progress before save initialization.');
 const trackedLeadIds:string[]=[];
 if(leadState.status==='tracked')trackedLeadIds.push(relicLead.id);
 if(wallMessageLeadState.status==='tracked')trackedLeadIds.push(wallMessageLead.id);
 if(keeperLeadState.status==='tracked')trackedLeadIds.push(keeperLead.id);
 const unlockedLocationIds:string[]=[];
 const searchedLocationIds:string[]=[];
 if(investigationChain.locationStatus!=='locked')unlockedLocationIds.push(clockTowerLocation.id);
 if(investigationChain.locationStatus==='searched')searchedLocationIds.push(clockTowerLocation.id);
 const discoveredEvidenceIds=[...discoveredInvestigationEvidenceIds,...pumpHouseState.discoveredEvidenceIds,...waterworksState.discoveredEvidenceIds];
 if(maintenanceYardState.regulatorCollected)discoveredEvidenceIds.push('brass-regulator');
 if(pumpHouseState.ledgerRecovered)discoveredEvidenceIds.push('crescent-order-mark');
 return captureInvestigationSave(currentSave,{
  discoveredClueIds:state.discoveredClueIds,
  solvedPuzzleIds:[...(fountainPuzzleState.status==='solved'?[fountainPuzzle.id]:[]),...(servicePuzzleState.status==='solved'?[servicePanelPuzzle.id]:[]),...(pumpHouseState.status==='mechanism-open'||pumpHouseState.status==='ledger-recovered'||pumpHouseState.status==='deduction-complete'?['pump-house-mechanism']:[]),...waterworksState.status==='incident-reconstructed'?['waterworks-timeline']:[]],
  discoveredEvidenceIds,
  trackedLeadIds,
  unlockedLocationIds,
  searchedLocationIds,
  askedKeeperTopicIds:keeperState.askedTopicIds,
  presentedKeeperEvidenceIds:keeperState.presentedEvidenceIds,
  recoveredObjectIds:[...(relicState.status==='collected'?[fountainRelic.id]:[]),...(maintenanceYardState.regulatorCollected?['brass-regulator']:[]),...(pumpHouseState.ledgerRecovered?['sealed-ledger']:[])],
  completedDeductionIds:[...(deductionSolved?['town-square-deduction']:[]),...(maintenanceYardState.deductionId? [maintenanceYardState.deductionId]:[]),...(pumpHouseState.deductionId?[pumpHouseState.deductionId]:[])]
 });
}
function requestGameSave(forceWhilePaused=false){
 if(!currentSave||(gamePaused&&!forceWhilePaused))return;
 const snapshot=captureRuntimeSave();
 saveQueue=saveQueue.then(async()=>{if(gamePaused&&!forceWhilePaused)return;const saved=await gamePersistence.save(snapshot);if(!saved||gamePaused)return;const score=calculateInvestigationScore(snapshot);if(score>lastSubmittedScore){await playablesPlatform.sendScore(score);lastSubmittedScore=score;}}).catch(error=>{console.error('Investigation save or score submission failed',error);});
}
function scheduleGameSave(){
 window.clearTimeout(saveTimer);
 saveTimer=window.setTimeout(requestGameSave,180);
}
function restoreRuntimeSave(save:import('./domain/game-save').GameSaveData){
 currentSave=save;
 for(const id of save.discoveredClueIds){state=discoverClue(state,id,clues);}
 clueMeshes.forEach(mesh=>{mesh.visible=!state.discoveredClueIds.includes(String(mesh.userData['clueId']));});
 document.querySelector('#count')!.textContent=String(state.discoveredClueIds.length);
 document.querySelector('#evidence')!.replaceChildren(...state.discoveredClueIds.map(id=>{const item=clues.find(clue=>clue.id===id);const button=document.createElement('button');button.type='button';button.className='clue';button.dataset['clueId']=id;button.textContent='✦ '+(item?.title??id);return button;}));
 if(state.discoveredClueIds.length===3){document.querySelector<HTMLButtonElement>('#deduction-open')!.hidden=false;document.querySelector('#status')!.textContent='EVIDENCE COLLECTION COMPLETE';}
 if(state.discoveredClueIds.includes('note')&&!save.solvedPuzzleIds.includes(fountainPuzzle.id)){
  fountainPuzzleState=createPuzzleState(fountainPuzzle,state.discoveredClueIds);
  document.querySelector<HTMLButtonElement>('#puzzle-open')!.hidden=false;
 }
 if(save.solvedPuzzleIds.includes(fountainPuzzle.id)){
  fountainPuzzleState=createPuzzleState(fountainPuzzle,state.discoveredClueIds);
  for(const symbol of fountainPuzzle.sequence)fountainPuzzleState=interactWithPuzzle(fountainPuzzleState,fountainPuzzle,symbol,state.discoveredClueIds).state;
  compartmentOpen=true;compartmentReveal=1;lidHinge.rotation.x=-1.28;
  relicState=createRelicState(fountainRelic,[fountainPuzzle.id]);
  hiddenRelic.visible=true;relicButton.hidden=false;document.querySelector<HTMLButtonElement>('#puzzle-open')!.hidden=true;
 }
 if(save.investigation.recoveredObjectIds.includes(fountainRelic.id)){
  relicState=collectRelic(relicState,fountainRelic,0,relicRange).state;
  hiddenRelic.visible=false;relicButton.hidden=true;relicInventory.hidden=false;relicInventory.textContent='✦ '+fountainRelic.name;
  // Recovering the relic also creates a pending lead. Preserve that prompt even
  // when the player closes the lead dialog without pinning it yet.
  leadState=revealInvestigationLead(leadState,relicLead,[fountainRelic.id]);
  currentLead=relicLead;
  document.querySelector<HTMLElement>('#lead-title')!.textContent=relicLead.title;
  document.querySelector<HTMLElement>('#lead-observation')!.textContent=relicLead.observation;
  document.querySelector<HTMLElement>('#lead-objective')!.textContent=relicLead.nextObjective;
  document.querySelector<HTMLElement>('#lead-location')!.textContent=relicLead.locationHint;
  leadReviewButton.hidden=false;
 }
 if(save.investigation.trackedLeadIds.includes(relicLead.id)){
  leadState=revealInvestigationLead(leadState,relicLead,[fountainRelic.id]);leadState=trackInvestigationLead(leadState);
  investigationChain=unlockInvestigationLocation(investigationChain,[relicLead.id],clockTowerLocation);
  locationButton.hidden=false;locationMarker.visible=true;leadReviewButton.hidden=true;
  activeLead.textContent='NEXT LEAD · '+relicLead.title+' — '+relicLead.nextObjective;activeLead.hidden=false;
 }
 if(save.investigation.searchedLocationIds.includes(clockTowerLocation.id)){
  investigationChain=searchInvestigationLocation(investigationChain,clockTowerLocation.id,clockTowerLocation).state;
  discoveredInvestigationEvidenceIds.push(clockTowerLocation.evidence.id);
  servicePuzzleState=createServicePanelPuzzleState(servicePanelPuzzle,[clockTowerLocation.evidence.id]);
  servicePuzzleButton.hidden=false;locationButton.textContent='REVIEW CLOCK TOWER EVIDENCE';locationButton.hidden=false;
  document.querySelector<HTMLElement>('#location-evidence')!.hidden=false;
  document.querySelector<HTMLElement>('#location-evidence-title')!.textContent=clockTowerLocation.evidence.title;
  document.querySelector<HTMLElement>('#location-evidence-description')!.textContent=clockTowerLocation.evidence.description;
  locationSearchButton.hidden=true;
 }
 if(save.investigation.solvedPuzzleIds.includes(servicePanelPuzzle.id)){
  for(const symbol of servicePanelPuzzle.sequence)servicePuzzleState=interactWithServicePanel(servicePuzzleState,servicePanelPuzzle,symbol,[clockTowerLocation.evidence.id]).state;
  discoveredInvestigationEvidenceIds.push('keeper-message');
  wallMessageLeadState=revealInvestigationLead(wallMessageLeadState,wallMessageLead,[clockTowerLocation.evidence.id]);
  if(!save.investigation.trackedLeadIds.includes(wallMessageLead.id)){
   currentLead=wallMessageLead;leadReviewButton.hidden=false;
   document.querySelector<HTMLElement>('#lead-title')!.textContent=wallMessageLead.title;
   document.querySelector<HTMLElement>('#lead-observation')!.textContent=wallMessageLead.observation;
   document.querySelector<HTMLElement>('#lead-objective')!.textContent=wallMessageLead.nextObjective;
   document.querySelector<HTMLElement>('#lead-location')!.textContent=wallMessageLead.locationHint;
  }
  document.querySelector<HTMLElement>('#keeper-lead')!.hidden=false;
  keeperState=unlockKeeperEncounter(keeperState);keeperNpc.visible=true;keeperButton.hidden=false;
 }
 if(save.investigation.trackedLeadIds.includes(wallMessageLead.id)){
  wallMessageLeadState=trackInvestigationLead(wallMessageLeadState);
  keeperState=unlockKeeperEncounter(keeperState);keeperNpc.visible=true;keeperButton.hidden=false;
 }
 for(const topic of save.investigation.askedKeeperTopicIds){if(['clock','maintenance','missing-object'].includes(topic))keeperState=askKeeperAbout(keeperState,keeperDefinition,topic as 'clock'|'maintenance'|'missing-object').state;}
 if(save.investigation.presentedKeeperEvidenceIds.includes(keeperDefinition.presentedEvidenceId)){
  keeperState=presentEvidenceToKeeper(keeperState,keeperDefinition,keeperDefinition.presentedEvidenceId,['three-line-imprint','keeper-message']).state;
  keeperLeadState=revealInvestigationLead(keeperLeadState,keeperLead,['keeper-message']);
  document.querySelector<HTMLElement>('#keeper-lead')!.hidden=false;
  document.querySelector<HTMLButtonElement>('#keeper-track-yard-lead')!.hidden=false;
 }
 syncBoardEvidence();renderServicePuzzle();renderKeeperPanel();
}
async function initializeGamePersistence(){
 try{
  const result=await gamePersistence.initialize();
  restoreRuntimeSave(result.save);
  if(result.warning)notify(result.warning);
  if(playablesPlatform.isInPlayablesEnvironment){
   const cloudStatus=result.source==='cloud'?'PLAYABLES CLOUD RESTORED · '+result.save.discoveredClueIds.length+'/3 CLUES · '+result.save.investigation.recoveredObjectIds.length+' OBJECTS':result.writable?'PLAYABLES CLOUD EMPTY · NEW SAVE':'PLAYABLES CLOUD LOAD FAILED · SAVE PROTECTED';
   console.info('[Persistence diagnostic]',{status:cloudStatus,source:result.source,writable:result.writable,warning:result.warning??null});
   if(toast){toast.textContent=cloudStatus;toast.classList.add('show');window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>toast.classList.remove('show'),10000);}
  }
  currentSave=result.save;
  const restoredScore=calculateInvestigationScore(result.save);
  if(restoredScore>0){saveQueue=saveQueue.then(async()=>{if(gamePaused)return;await playablesPlatform.sendScore(restoredScore);lastSubmittedScore=Math.max(lastSubmittedScore,restoredScore);}).catch(error=>{console.warn('Initial Playables score submission failed',error);});}
  playablesPlatform.registerLifecycle({onPause:()=>{if(gamePaused)return;gamePaused=true;sceneRoot.dataset['gamePaused']='true';sceneRoot.dataset['pauseSource']='playables-sdk';gameInteractable=false;resetJoystickInput();window.clearTimeout(saveTimer);window.clearTimeout(toastTimer);toast?.classList.remove('show');gameAudio.pause();clock.stop();cancelAnimationFrame(frame);requestGameSave(true);},onResume:()=>{if(!gamePaused)return;gamePaused=false;sceneRoot.dataset['gamePaused']='false';sceneRoot.dataset['pauseSource']='resumed';clock.start();gameAudio.resume();gameInteractable=gameReadyNotified;animate();},onAudioEnabledChange:enabled=>{gameAudio.setEnabled(enabled);}});
  document.addEventListener('click',()=>{gameAudio.playUiCue();scheduleGameSave();});
  persistenceReady=true;
  notifyReadyWhenPossible();
 }catch(error){console.error('Game persistence initialization failed',error);if(toast){toast.textContent='PLAYABLES CLOUD LOAD ERROR · '+(error instanceof Error?error.message:'UNKNOWN ERROR');toast.classList.add('show');window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>toast.classList.remove('show'),10000);}notify('Progress saving is unavailable for this session.');}
}
void initializeGamePersistence();

animate();
window.addEventListener('pagehide',()=>{sceneRoot.dataset['pageHidden']='true';cancelAnimationFrame(frame);observer.disconnect();gameAudio.dispose();playablesPlatform.dispose();renderer.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});window.clearTimeout(toastTimer);},{once:true});
