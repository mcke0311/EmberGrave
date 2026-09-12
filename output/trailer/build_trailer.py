"""Rebuild the 40-second EMBERGRAVE trailer from local game assets.

Requires Python/Pillow and ffmpeg.exe in this folder (or FFMPEG on PATH).
All footage was captured from the existing isolated game review. No saves change.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import subprocess, json, re, os, math

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
FF = str(HERE / 'ffmpeg.exe') if (HERE/'ffmpeg.exe').exists() else os.environ.get('FFMPEG','ffmpeg')
W,H,FPS = 1920,1080,30
for folder in ('graphics','segments','review'):
    (HERE/folder).mkdir(exist_ok=True)

def run(args, capture=False):
    p=subprocess.run([FF,'-hide_banner','-y',*map(str,args)],capture_output=True,text=True)
    if p.returncode: raise RuntimeError(p.stderr[-6000:])
    return p.stderr if capture else None

def duration(path):
    p=subprocess.run([FF,'-hide_banner','-i',str(path)],capture_output=True,text=True)
    m=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',p.stderr)
    if not m: raise RuntimeError('Cannot read duration: '+str(path))
    return int(m[1])*3600+int(m[2])*60+float(m[3])

def font(size,serif=True):
    return ImageFont.truetype('C:/Windows/Fonts/'+('georgia.ttf' if serif else 'segoeui.ttf'),size)

def tracking(draw,text,y,size,spacing=4,color='#f3e7cc',x=None,serif=True):
    f=font(size,serif);width=sum(draw.textlength(c,font=f) for c in text)+spacing*(len(text)-1)
    if x is None: x=(W-width)/2
    for c in text:
        draw.text((x,y),c,font=f,fill=color,stroke_width=0)
        x+=draw.textlength(c,font=f)+spacing

def caption(name,eyebrow,title,center=False):
    im=Image.new('RGBA',(W,H));d=ImageDraw.Draw(im)
    for y in range(660,H):
        alpha=int(218*((y-660)/(H-660))**1.35)
        d.line((0,y,W,y),fill=(5,8,10,alpha))
    if center:
        tracking(d,eyebrow,820,23,5,'#d3a866',serif=False)
        tracking(d,title,875,62,2)
    else:
        d.rectangle((104,843,164,846),fill='#cd954d')
        tracking(d,eyebrow,821,24,4,'#deb879',x=190,serif=False)
        tracking(d,title,882,62,1.7,x=104)
    im.save(HERE/'graphics'/f'{name}.png')

caption('intro','THE SUNDERSTONE SAGA','THE STONE IS SHATTERED',True)
caption('north','ENTER THE FALLEN NORTH','FIVE ACTS. ONE SHATTERED WORLD.')
caption('korvath','VANGUARD','MASTER THE BLADE')
caption('marsh','GRAVEBINDER','COMMAND THE DEAD')
caption('cathedral','VEIL RANGER','STRIKE FROM THE SHADOWS')
caption('wildkeeper','WILDKEEPER','CALL THE WILD')
caption('inferno','EMBER WITCH','UNLEASH THE ELEMENTS')

# The portrait cinematic keeps its original aspect ratio and all source credits.
im=Image.new('RGBA',(W,H));d=ImageDraw.Draw(im)
for x in range(1100):
    d.line((x,0,x,H),fill=(4,6,9,int(235*max(0,1-x/1100)**.55)))
tracking(d,'SOME OATHS',398,59,2,x=95)
tracking(d,'SHOULD STAY',480,59,2,x=95)
tracking(d,'BURIED.',562,75,3,'#dfb574',x=95)
im.save(HERE/'graphics'/'cinematic.png')

im=Image.new('RGBA',(W,H));d=ImageDraw.Draw(im)
tracking(d,'DARK FANTASY  /  ACTION RPG',320,24,5,'#c8b99c',serif=False)
tracking(d,'EMBERGRAVE',416,143,7,'#efd6a0')
tracking(d,'THE SUNDERSTONE SAGA',602,36,7,'#eadcc2')
d.line((688,697,916,697),fill='#946d39',width=2)
d.line((1004,697,1232,697),fill='#946d39',width=2)
d.polygon([(960,684),(973,697),(960,710),(947,697)],outline='#d4a157',width=2)
tracking(d,'BEGIN YOUR SAGA',759,28,6,'#eadac1',serif=False)
im.save(HERE/'graphics'/'title.png')

# Durations are exact frame multiples, with a total runtime of 40 seconds.
scenes=[
 dict(id='intro',source='assets/cine_oathsworn.mp4',start=.2,length=4.,kind='fit',caption='intro'),
 dict(id='north',source='output/trailer/clips/north.webm',start=.85,length=3.2,kind='game',caption='north'),
 dict(id='korvath',source='output/trailer/clips/korvath.webm',start=.3,length=4.4,kind='game',caption='korvath'),
 dict(id='marsh',source='output/trailer/clips/marsh.webm',start=.3,length=4.4,kind='game',caption='marsh'),
 dict(id='cathedral',source='output/trailer/clips/cathedral.webm',start=.4,length=3.6,kind='game',caption='cathedral'),
 dict(id='cinematic',source='assets/cine_korvath.mp4',start=2.,length=2.6,kind='portrait',caption='cinematic'),
 dict(id='wildkeeper',source='output/trailer/clips/wildkeeper.webm',start=.9,length=3.6,kind='game',caption='wildkeeper'),
 dict(id='inferno',source='output/trailer/clips/inferno.webm',start=.5,length=5.4,kind='game',caption='inferno'),
 dict(id='flash_archangel',source='output/trailer/clips/cathedral.webm',start=6.,length=.8,kind='game'),
 dict(id='flash_marsh',source='output/trailer/clips/marsh.webm',start=5.4,length=.8,kind='game'),
 dict(id='flash_korvath',source='output/trailer/clips/korvath.webm',start=4.8,length=.8,kind='game'),
 dict(id='title',source='assets/cine_oathsworn.mp4',start=5.3,length=6.4,kind='title',caption='title'),
]

clock=0
for index,s in enumerate(scenes):
    s['timeline_start']=round(clock,3);clock+=s['length']
    src=ROOT/s['source'];target=HERE/'segments'/f'{index:02d}-{s["id"]}.mp4'
    inputs=['-i',src]
    if s.get('caption'): inputs+=['-loop','1','-i',HERE/'graphics'/f'{s["caption"]}.png']
    # Undo recording overhead so the production simulation plays at its intended speed.
    speed=1
    if s['kind']=='game':
        simulation={'north':5,'korvath':7,'marsh':7,'cathedral':7,'wildkeeper':7,'inferno':8}
        speed=duration(src)/simulation[src.stem]
    take=s['length']*speed
    base=f"[0:v]trim=start={s['start']}:duration={take},setpts=(PTS-STARTPTS)/{speed},fps={FPS},setsar=1"
    if s['kind']=='game':
        filters=[base+',scale=1920:1080:flags=lanczos,eq=gamma=1.10:contrast=1.035:saturation=1.07[v]']
    else:
        filters=[base+'[src]', '[src]split=2[bg][fg]',
            '[bg]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,gblur=sigma=38,eq=brightness=-0.10:saturation=0.65[back]']
        if s['kind']=='portrait':
            filters+=['[fg]scale=-2:1040:flags=lanczos[front]','[back][front]overlay=x=1020:y=(H-h)/2[v]']
        else:
            filters+=['[fg]scale=-2:1040:flags=lanczos[front]','[back][front]overlay=x=(W-w)/2:y=(H-h)/2[v]']
    if s['kind']=='title':
        filters+=['[v]eq=brightness=-0.12:saturation=0.6,colorchannelmixer=rr=.40:gg=.40:bb=.43[dark]']
        visual='dark'
    else:visual='v'
    if s.get('caption'):
        start=.5 if s['id']=='intro' else (.3 if s['id']=='title' else .15)
        filters += [f'[1:v]format=rgba,fade=t=in:st={start}:d=0.3:alpha=1[caption]',f'[{visual}][caption]overlay=0:0:shortest=1[captioned]']
        visual='captioned'
    tail=f'[{visual}]'
    if s['id']=='intro':tail+='fade=t=in:st=0:d=0.5,'
    if s['id']=='title':tail+=f"fade=t=in:st=0:d=0.22,fade=t=out:st={s['length']-.65}:d=0.65,"
    tail+='format=yuv420p[out]';filters+=[tail]
    print('Rendering',s['id'],flush=True)
    run([*inputs,'-filter_complex_threads','2','-filter_complex',';'.join(filters),'-map','[out]',
         '-an','-t',s['length'],'-r',FPS,'-c:v','libx264','-preset','fast','-crf','18','-threads','4','-pix_fmt','yuv420p',target])
assert abs(clock-40)<.001
(HERE/'timeline.json').write_text(json.dumps(scenes,indent=2))
concat=HERE/'segments'/'concat.txt'
concat.write_text('\n'.join("file '"+f'{i:02d}-{s["id"]}.mp4'+"'" for i,s in enumerate(scenes)))
silent=HERE/'segments'/'picture.mp4'
run(['-f','concat','-safe','0','-i',concat,'-c','copy',silent])

# The game soundtrack carries the cut. Short game sounds accent the key edits.
audio_inputs=['-i',silent,'-ss','5.6','-i',ROOT/'assets/music/Black Rune Oath.mp3',
 '-i',ROOT/'assets/sound-effects/skills/thunder_2.wav',
 '-i',ROOT/'assets/sound-effects/skills/steel_2.wav',
 '-i',ROOT/'assets/sound-effects/skills/fire_3.wav',
 '-i',ROOT/'assets/sound-effects/interactions/portalOpen.wav']
audio_filters=[
 '[1:a]atrim=duration=40,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.7,afade=t=out:st=37.4:d=2.6,volume=0.90[music]',
 '[2:a]atrim=duration=2.5,afade=t=out:st=1.7:d=0.8,volume=.45,adelay=19600|19600[thunder]',
 '[3:a]volume=.45,adelay=7200|7200[steel]',
 '[4:a]volume=.45,adelay=25800|25800[fire]',
 '[5:a]atrim=duration=3,afade=t=out:st=2:d=1,volume=.25,adelay=33600|33600[titlehit]',
 '[music][thunder][steel][fire][titlehit]amix=inputs=5:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=9,aresample=48000[audio]']
final=HERE/'EMBERGRAVE-Gameplay-Trailer-40s.mp4'
print('Mixing music and exporting final MP4',flush=True)
run([*audio_inputs,'-filter_complex',';'.join(audio_filters),'-map','0:v:0','-map','[audio]',
 '-c:v','copy','-c:a','aac','-b:a','256k','-t','40','-movflags','+faststart',
 '-metadata','title=EMBERGRAVE | The Sunderstone Saga | Gameplay Trailer',
 '-metadata','comment=Game footage captured from isolated review sessions; existing game cinematics and soundtrack.',final])

# Review every shot, including the portrait source, large captions and closing card.
times=[1.8,5.4,9.4,13.8,17.8,20.8,24,28.5,31.6,32.4,33.2,36.5]
board=Image.new('RGB',(1440,4*292),'#111215');d=ImageDraw.Draw(board)
for i,t in enumerate(times):
    p=HERE/'review'/f'final-{t:.1f}.jpg'
    run(['-v','error','-ss',t,'-i',final,'-frames:v','1','-vf','scale=480:270',p])
    board.paste(Image.open(p),((i%3)*480,(i//3)*292))
    d.text(((i%3)*480+8,(i//3)*292+272),f'{t:.1f}s',font=font(14,False),fill='white')
board.save(HERE/'review'/'final-contact-sheet.jpg',quality=94)
run(['-v','error','-ss','36','-i',final,'-frames:v','1',HERE/'poster.jpg'])
check=run(['-v','error','-i',final,'-f','null','-'],True)
levels=run(['-i',final,'-vn','-af','volumedetect','-f','null','-'],True)
black=run(['-i',final,'-an','-vf','blackdetect=d=0.12:pix_th=.08','-f','null','-'],True)
report={'file':final.name,'duration_seconds':duration(final),'resolution':[W,H],'fps':FPS,
 'size_bytes':final.stat().st_size,'full_decode_errors':check.strip(),
 'audio_levels':[line.strip() for line in levels.splitlines() if 'mean_volume:' in line or 'max_volume:' in line],
 'black_intervals':[line.strip() for line in black.splitlines() if 'black_start:' in line],
 'footage_note':'All five classes captured in the existing isolated boss review. Heroes invulnerable for capture; source gameplay runs at normal simulation speed.',
 'soundtrack':'Black Rune Oath (existing project asset), with game sound effects.',
 'cinematics':'Existing cine_oathsworn.mp4 and cine_korvath.mp4; aspect ratios and source watermarks retained.'}
(HERE/'verification.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2),flush=True)
