import numpy as np, wave
SR=48000; DUR=15.0; N=int(SR*DUR); BPM=120; B=60/BPM
L=np.zeros(N); R=np.zeros(N)
rng=np.random.default_rng(7)
def put(sig,t,g=1.0,pan=0.0):
    i=int(t*SR); j=min(N,i+len(sig)); s=sig[:j-i]*g
    L[i:j]+=s*(1-max(0,pan)); R[i:j]+=s*(1+min(0,pan))
def kick():
    t=np.arange(int(SR*0.45))/SR; f=45+90*np.exp(-t*28); ph=2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*np.exp(-t*7)+0.3*np.sin(ph*2)*np.exp(-t*30)
def hat(d=0.06):
    t=np.arange(int(SR*d))/SR; n=rng.standard_normal(len(t)); n=np.diff(n,prepend=0)
    return n*np.exp(-t*60)*0.35
def clap():
    t=np.arange(int(SR*0.25))/SR; n=rng.standard_normal(len(t))
    env=np.exp(-t*25)+0.6*np.exp(-((t-0.012)*400)**2)+0.5*np.exp(-((t-0.024)*400)**2)
    return np.convolve(n,[1,-0.9],'same')*env*0.4
def whoosh(d=0.5,rev=False):
    t=np.arange(int(SR*d))/SR; n=rng.standard_normal(len(t))
    k=np.linspace(0,1,len(t)); env=(k**2 if not rev else (1-k)**2)*np.sin(np.pi*k)**0.3
    out=np.zeros_like(n); a=0
    for i in range(len(n)):  # sweeping one-pole lowpass
        c=0.02+0.5*(k[i] if not rev else 1-k[i]); a+= c*(n[i]-a); out[i]=a
    return out*env*0.8
def hit():
    t=np.arange(int(SR*0.9))/SR
    return (np.sin(2*np.pi*55*t)*np.exp(-t*4)+0.5*rng.standard_normal(len(t))*np.exp(-t*18))*0.8
def tick():
    t=np.arange(int(SR*0.03))/SR; return np.sin(2*np.pi*3200*t)*np.exp(-t*200)*0.35
def bass(f,d):
    t=np.arange(int(SR*d))/SR; s=np.sign(np.sin(2*np.pi*f*t))*0.5+np.sin(2*np.pi*f*t)
    env=np.minimum(1,t*80)*np.exp(-t*3)
    # lowpass
    out=np.zeros_like(s); a=0
    for i in range(len(s)): a+=0.06*(s[i]-a); out[i]=a
    return out*env*0.5
nb=int(DUR/B)
roots=[55,55,65.4,49]*8
for i in range(nb):
    t=i*B
    if t>=14.0: break
    sec=t
    if not (12.6<=sec<12.75):
        put(kick(),t,0.9)
    if i%2==1: put(clap(),t,0.7)
    put(hat(),t+B/2,0.5,0.3); 
    if 2.5<=sec<10: put(hat(0.03),t+B/4,0.25,-0.3); put(hat(0.03),t+3*B/4,0.25,-0.3)
    put(bass(roots[(i//4)%len(roots)],B*0.9),t,0.6)
for s0 in [2.5,5.0,7.5,10.0,12.75]:
    put(whoosh(0.45),s0-0.45,0.6); put(hit(),s0,0.7)
for t in np.arange(10.35,12.75,B): put(tick(),t,0.8,0.2)
put(hit(),14.0,0.6)
# card dot pops
for t in [1.25,13.7]: put(tick(),t,1.2)
mix=np.stack([L,R],1); mix/=np.max(np.abs(mix))+1e-9; mix*=0.9
# fade out tail
fo=int(SR*0.6); mix[-fo:]*=np.linspace(1,0,fo)[:,None]
w=wave.open('assets/mix_raw.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((mix*32767).astype(np.int16).tobytes()); w.close()
