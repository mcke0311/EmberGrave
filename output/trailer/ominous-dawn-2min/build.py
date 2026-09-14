"""Reproducible 120-second Embergrave trailer using Ominous Dawn.
Run capture.cjs against a local game server before the first build.
Requires Pillow, NumPy and ../ffmpeg.exe. Only this output directory is written.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import subprocess, json, re, math, shutil, hashlib, sys

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
FF=str(HERE.parent/'ffmpeg.exe')
W,H,FPS=1920,1080,30
FINAL=HERE/'EMBERGRAVE-Ominous-Dawn-Trailer-2min.mp4'
for folder in ['graphics','segments','review','music']:(HERE/folder).mkdir(exist_ok=True)
MUSIC=HERE/'music'/'Ominous Dawn.mp3'
if not MUSIC.exists():shutil.copy2(Path('C:/Users/this_/Downloads/Ominous Dawn.mp3'),MUSIC)

def ff(args):
    p=subprocess.run([FF,'-hide_banner','-y',*map(str,args)],capture_output=True,text=True)
    if p.returncode:raise RuntimeError(p.stderr[-7000:])
    return p.stderr

def info(path):
    p=subprocess.run([FF,'-hide_banner','-i',str(path)],capture_output=True,text=True)
    m=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',p.stderr)
    return {'duration':int(m[1])*3600+int(m[2])*60+float(m[3]),'probe':p.stderr}

def font(size,style='serif'):
    f=ROOT/'assets/fonts/exocet.otf' if style=='brand' else Path('C:/Windows/Fonts')/('georgia.ttf' if style=='serif' else 'segoeui.ttf')
    return ImageFont.truetype(str(f),size)

def type_line(d,text,y,size=55,spacing=2,color='#efdfc0',x=None,style='serif'):
    f=font(size,style);width=sum(d.textlength(c,font=f) for c in text)+spacing*(len(text)-1)
    if x is None:x=(W-width)/2
    assert x>=60 and x+width<=W-60,(text,width,x)
    for c in text:
        d.text((x+2,y+3),c,font=f,fill=(0,0,0,190),stroke_width=2)
        d.text((x,y),c,font=f,fill=color)
        x+=d.textlength(c,font=f)+spacing

def lower(name,label,title,center=False):
    im=Image.new('RGBA',(W,H));d=ImageDraw.Draw(im)
    for y in range(705,H):d.line((0,y,W,y),fill=(4,7,10,int(205*((y-705)/(H-705))**1.4)))
    if center:
        type_line(d,label,831,23,5,'#d4ab6d',style='sans')
        type_line(d,title,889,59,2)
    else:
        d.line((104,855,159,855),fill='#cda36a',width=3)
        type_line(d,label,835,24,4,'#dab781',190,style='sans')
        type_line(d,title,898,56,1.3,x=104)
    im.save(HERE/'graphics'/f'{name}.png')

lower('intro','THE SUNDERSTONE SAGA','THE STONE IS SHATTERED',True)
lower('frosthaven','ACT I  /  THE FALLEN NORTH','YOUR SAGA BEGINS HERE')
lower('vanguard','VANGUARD','MASTER THE BLADE')
lower('gravebinder','GRAVEBINDER','COMMAND THE DEAD')
lower('wildkeeper','WILDKEEPER','CALL THE WILD')
lower('veilranger','VEIL RANGER','STRIKE FROM THE SHADOWS')
lower('emberwitch','EMBER WITCH','UNLEASH THE ELEMENTS')
lower('marsh','ACT II','THE WEEPING MARSH')
lower('sand','ACT III','THE CITY BENEATH THE SAND')
lower('cathedral','ACT IV','THE SHATTERED CATHEDRAL')
lower('cinders','ACT V','THE THRONE OF CINDERS')
lower('hollowking','THE HOLLOW KING','FACE WHAT REMAINS')

im=Image.new('RGBA',(W,H));d=ImageDraw.Draw(im)
for x in range(1120):d.line((x,0,x,H),fill=(4,6,9,int(210*max(0,1-x/1120)**.6)))
type_line(d,'SOME OATHS',387,65,2,x=105)
type_line(d,'SHOULD STAY',478,65,2,x=105)
type_line(d,'BURIED.',578,83,3,'#deb679',x=105)
im.save(HERE/'graphics'/'oaths.png')

def divider(d,y):
    d.line((600,y,915,y),fill='#967344',width=2);d.line((1005,y,1320,y),fill='#967344',width=2)
    d.polygon([(960,y-12),(972,y),(960,y+12),(948,y)],outline='#dcb16d',width=2)

im=Image.new('RGBA',(W,H));d=ImageDraw.Draw(im)
type_line(d,'FIVE ACTS',373,98,6,'#eed8ac',style='brand')
divider(d,551)
type_line(d,'ONE SHATTERED WORLD',613,46,5)
im.save(HERE/'graphics'/'world.png')

im=Image.new('RGBA',(W,H));d=ImageDraw.Draw(im)
type_line(d,'DARK FANTASY  /  ACTION RPG',320,24,5,'#d9cbb2',style='sans')
type_line(d,'EMBERGRAVE',423,140,7,'#efd7a4',style='brand')
type_line(d,'THE SUNDERSTONE SAGA',607,34,7,'#ede0c8')
divider(d,711)
type_line(d,'BEGIN YOUR SAGA',773,30,6,'#eed9b5',style='sans')
type_line(d,'MUSIC  /  OMINOUS DAWN',957,19,3,'#b6aa95',style='sans')
im.save(HERE/'graphics'/'title.png')

# Source music runs continuously from 0:00 to 2:00. Cuts follow its measured attacks.
# All times are quantized to frames; their sum is exactly 3600 frames.
cuts=[0,7.46,15.26,22,30.2,37.56,45.5,52.92,60.08,64.22,69.8,76.38,81.98,86.94,94.36,99.2,104.02,107.64,111.02,114.26,120]
frames=[round(t*FPS) for t in cuts]
scenes=[
 dict(id='awakening',source='assets/cine_oathsworn.mp4',start=0,kind='cine',caption='intro'),
 dict(id='frosthaven',clip='frosthaven',start=0.7,kind='game',caption='frosthaven'),
 dict(id='oaths',source='assets/cine_korvath.mp4',start=1,kind='portrait',caption='oaths'),
 dict(id='vanguard',clip='vanguard',start=0.4,kind='game',caption='vanguard'),
 dict(id='gravebinder',clip='gravebinder',start=0.4,kind='game',caption='gravebinder'),
 dict(id='wildkeeper',clip='wildkeeper',start=0.4,kind='game',caption='wildkeeper'),
 dict(id='veilranger',clip='veilranger',start=0.4,kind='game',caption='veilranger'),
 dict(id='emberwitch',clip='emberwitch',start=0.4,kind='game',caption='emberwitch'),
 dict(id='world',source='assets/embergrave-title-bg.png',start=0,kind='card',caption='world'),
 dict(id='marsh',clip='marsh',start=0.5,kind='game',caption='marsh'),
 dict(id='sand',clip='sand',start=0.5,kind='game',caption='sand'),
 dict(id='cathedral',clip='cathedral',start=1,kind='game',caption='cathedral'),
 dict(id='cinders',clip='cinders',start=1,kind='game',caption='cinders'),
 dict(id='hollowking',clip='hollowking',start=2,kind='game',caption='hollowking'),
 dict(id='steel',clip='vanguard',start=8.8,kind='game'),
 dict(id='death',clip='gravebinder',start=8.7,kind='game'),
 dict(id='wild',clip='wildkeeper',start=10,kind='game'),
 dict(id='shadow',clip='veilranger',start=10,kind='game'),
 dict(id='fire',clip='emberwitch',start=12,kind='game'),
 dict(id='title',source='assets/embergrave-title-bg.png',start=0,kind='card',caption='title')
]
for i,s in enumerate(scenes):
    s.update(frames=frames[i+1]-frames[i],timeline_start=frames[i]/FPS)
    s['length']=s['frames']/FPS
    if s.get('clip'):s['source']=str((HERE/'clips'/f'{s["clip"]}.mp4').relative_to(ROOT)).replace('\\','/')
assert sum(s['frames'] for s in scenes)==3600
(HERE/'timeline.json').write_text(json.dumps(scenes,indent=2))

for i,s in enumerate(scenes):
    target=HERE/'segments'/f'{i:02d}-{s["id"]}.mp4'
    if '--resume' in sys.argv and target.exists() and abs(info(target)['duration']-s['length'])<.06:
        print('Using rendered '+s['id'],flush=True);continue
    source=ROOT/s['source'];length=s['length']
    if s['kind']!='card':assert s['start']+length<=info(source)['duration']+.04,s
    inputs=(['-loop','1'] if s['kind']=='card' else [])+['-i',source]
    if s.get('caption'):inputs+=['-loop','1','-i',HERE/'graphics'/f'{s["caption"]}.png']
    filters=[]
    base=f"[0:v]trim=start={s['start']}:duration={length},setpts=PTS-STARTPTS,fps=30,setsar=1"
    if s['kind']=='game':
        filters=[base+',scale=1920:1080:flags=lanczos,eq=gamma=1.08:contrast=1.025:saturation=1.035[v]']
    elif s['kind']=='card':
        filters=["[0:v]scale=2304:1296:force_original_aspect_ratio=increase,crop=2304:1296,zoompan=z='1.03+on*0.00013':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps=30,eq=brightness=-0.035:saturation=0.80,colorchannelmixer=rr=0.68:gg=0.68:bb=0.72[v]"]
    elif s['kind']=='portrait':
        filters=[base+'[src]','[src]split[bg][fg]',
                 '[bg]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,gblur=sigma=40,eq=brightness=-.13:saturation=0.6[back]',
                 '[fg]scale=-2:1040:flags=lanczos[front]','[back][front]overlay=x=1050:y=20[v]']
    else:
        # Keep the complete supplied cinematic, including its original composition.
        filters=[base+',scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,eq=gamma=1.035[v]']
    visual='v'
    if s.get('caption'):
        begin=1.0 if s['id']=='awakening' else .25
        end=length-.45 if s['kind'] in ('portrait','card') or length<6 else min(5.9,length-.6)
        filters += [f'[1:v]format=rgba,fade=t=in:st={begin}:d=0.45:alpha=1,fade=t=out:st={end}:d=0.4:alpha=1[caption]',
                    '[v][caption]overlay=0:0:shortest=1[lettered]']
        visual='lettered'
    tail=f'[{visual}]'
    if i==0:tail+='fade=t=in:st=0:d=0.7,'
    if s['id']=='world':tail+='fade=t=in:st=0:d=0.3,fade=t=out:st=3.9:d=0.25,'
    if s['id']=='title':tail+=f'fade=t=in:st=0:d=0.18,fade=t=out:st={length-1.1}:d=1.1,'
    filters += [tail+'format=yuv420p[out]']
    print(f'Rendering {i+1:02d}/20: {s["id"]} ({length:.2f}s)',flush=True)
    ff([*inputs,'-filter_complex_threads','2','-filter_complex',';'.join(filters),'-map','[out]','-an',
        '-frames:v',s['frames'],'-r',FPS,'-c:v','libx264','-preset','fast','-crf','18','-threads','4',
        '-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-pix_fmt','yuv420p',target])

concat=HERE/'segments'/'concat.txt'
concat.write_text('\n'.join(f"file '{i:02d}-{s['id']}.mp4'" for i,s in enumerate(scenes)))
picture=HERE/'segments'/'picture.mp4'
ff(['-f','concat','-safe','0','-i',concat,'-c','copy',picture])

# Restrained effects from the game's existing effects library support four cuts.
audio_inputs=['-i',picture,'-i',MUSIC,
 '-i',ROOT/'assets/sound-effects/skills/thunder_2.wav',
 '-i',ROOT/'assets/sound-effects/skills/steel_2.wav',
 '-i',ROOT/'assets/sound-effects/skills/fire_3.wav',
 '-i',ROOT/'assets/sound-effects/interactions/portalOpen.wav']
audio_filters=[
 '[1:a]atrim=start=0:end=120,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.25,afade=t=out:st=115.8:d=4.2[music]',
 '[2:a]atrim=duration=2.5,afade=t=out:st=1.5:d=1,volume=0.09,adelay=15267|15267[thunder]',
 '[3:a]volume=0.12,adelay=22000|22000[steel]',
 '[4:a]volume=0.09,adelay=52933|52933[fire]',
 '[5:a]atrim=duration=3,afade=t=out:st=1.7:d=1.3,volume=0.10,adelay=114267|114267[titlehit]',
 '[music][thunder][steel][fire][titlehit]amix=inputs=5:duration=first:normalize=0[mixed]']
print('Measuring music mix',flush=True)
raw=ff([*audio_inputs,'-filter_complex',';'.join(audio_filters+['[mixed]loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json[measure]']),'-map','[measure]','-vn','-f','null','-'])
measure=json.loads(re.search(r'\{\s*"input_i".*?\}',raw,re.S)[0])
norm=(f"loudnorm=I=-16:TP=-1.5:LRA=11:linear=true:measured_I={measure['input_i']}:measured_TP={measure['input_tp']}:measured_LRA={measure['input_lra']}:measured_thresh={measure['input_thresh']}:offset={measure['target_offset']}")
filters=audio_filters+['[mixed]'+norm+',aresample=48000[audio]']
print('Exporting final two-minute MP4',flush=True)
ff([*audio_inputs,'-filter_complex',';'.join(filters),'-map','0:v:0','-map','[audio]','-c:v','copy','-c:a','aac','-b:a','256k','-t','120','-movflags','+faststart',
    '-metadata','title=EMBERGRAVE | The Sunderstone Saga | Ominous Dawn',
    '-metadata','comment=120-second trailer. Soundtrack: Ominous Dawn, supplied by the creator. Game footage from isolated production-renderer captures.',FINAL])

print('Checking every shot and decoding the complete export',flush=True)
board=Image.new('RGB',(1440,math.ceil(len(scenes)/3)*293),'#101216');d=ImageDraw.Draw(board)
for i,s in enumerate(scenes):
    t=s['timeline_start']+min(2.5,s['length']/2);p=HERE/'review'/f'{i:02d}-{s["id"]}.jpg'
    ff(['-v','error','-ss',t,'-i',FINAL,'-frames:v','1','-vf','scale=480:270',p])
    x,y=i%3*480,i//3*293;board.paste(Image.open(p),(x,y));d.text((x+10,y+273),f'{t:06.2f}s  {s["id"]}',font=font(14,'sans'),fill='#cfc5b5')
board.save(HERE/'review'/'contact-sheet.jpg',quality=95)
ff(['-v','error','-ss','116.7','-i',FINAL,'-frames:v','1',HERE/'poster.jpg'])
decode=ff(['-v','error','-i',FINAL,'-f','null','-'])
levels=ff(['-i',FINAL,'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-'])
actual=json.loads(re.search(r'\{\s*"input_i".*?\}',levels,re.S)[0])
black=ff(['-i',FINAL,'-an','-vf','blackdetect=d=0.12:pix_th=0.08','-f','null','-'])
final_info=info(FINAL)
assert abs(final_info['duration']-120)<.02,final_info
assert not decode.strip(),decode
assert float(actual['input_tp'])<=-1.0,actual
report={'file':FINAL.name,'duration_seconds':final_info['duration'],'frame_count':3600,'resolution':[W,H],'fps':FPS,
 'video_codec':'H.264','audio_codec':'AAC stereo, 48 kHz, 256 kbps','size_bytes':FINAL.stat().st_size,
 'full_decode_errors':decode.strip(),'audio_loudness':actual,
 'black_intervals':[x.strip() for x in black.splitlines() if 'black_start:' in x],
 'soundtrack':'Ominous Dawn, user-supplied MP3; continuous source 0:00–2:00, with a 4.2-second ending fade.',
 'soundtrack_sha256':hashlib.sha256(MUSIC.read_bytes()).hexdigest(),
 'footage':'New 30-fps production-renderer captures. Temporary isolated hero saves, invulnerability and restored casting mana for capture; normal movement, attack timing, boss damage and simulation speed.',
 'cinematics':'Existing project cinematics; their complete composition and any source credits are retained.',
 'shots':len(scenes),'music_normalization':'Two-pass normalization to -16 LUFS and -1.5 dBTP; sparse game effects.'}
(HERE/'verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2),flush=True)
