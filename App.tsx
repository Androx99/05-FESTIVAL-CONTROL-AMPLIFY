import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { confirmSignIn, fetchAuthSession, signIn, signOut } from 'aws-amplify/auth';
import { client, configureAmplify } from './src/amplify';
import { eventStatuses, FestivalEvent, EventStatus } from './src/data';
import { theme as c } from './src/theme';

type Page = 'dashboard' | 'events' | 'form';
const stages = ['MAIN STAGE', 'GARDEN', 'WAREHOUSE', 'RIVER STAGE'];
const statuses: EventStatus[] = [...eventStatuses];

function throwIfErrors(errors?: readonly { message: string }[] | null) {
  if (errors?.length) throw new Error(errors.map(error => error.message).join('; '));
}

async function fetchEvents(): Promise<FestivalEvent[]> {
  const events: FestivalEvent[] = [];
  let nextToken: string | null | undefined;

  do {
    const result = await client.models.FestivalEvent.list({
      authMode: 'apiKey',
      limit: 1000,
      nextToken,
    });
    throwIfErrors(result.errors);
    events.push(...result.data);
    nextToken = result.nextToken;
  } while (nextToken);

  return events;
}

function isAdminSession(session: Awaited<ReturnType<typeof fetchAuthSession>>) {
  const groups = session.tokens?.accessToken.payload['cognito:groups'];
  return Array.isArray(groups) && groups.includes('Admins');
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Se produjo un error inesperado.';
}

function Action({ label, onPress, secondary = false, danger = false, disabled = false }: {label: string; onPress: () => void; secondary?: boolean; danger?: boolean; disabled?: boolean}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({pressed}) => [s.button, secondary && s.buttonSecondary, danger && s.buttonDanger, (pressed || disabled) && {opacity: .75}]}><Text style={s.buttonText}>{label}</Text></Pressable>;
}
function Status({value}: {value: EventStatus}) {
  const color = value === 'CONFIRMED' ? c.green : value === 'DELAYED' ? c.amber : c.red;
  return <Text style={[s.status, {color}]}>● {value}</Text>;
}
function EventCard({event, canManage, disabled, onEdit, onStatus, onDelete}: {event: FestivalEvent; canManage: boolean; disabled: boolean; onEdit: () => void; onStatus: () => void; onDelete: () => void}) {
  return <View style={s.card}>
    <View style={s.cardHeader}><Text style={s.time}>{event.time}</Text><Status value={event.status}/></View>
    <Text style={s.artist}>{event.artist}</Text>
    <Text style={s.space}>{event.space} · {event.code}</Text>
    {canManage && <View style={s.cardActions}>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={onEdit}><Text style={s.actionText}>EDITAR</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={onStatus}><Text style={s.actionText}>CAMBIAR ESTADO</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={onDelete}><Text style={[s.actionText,{color:c.red}]}>ELIMINAR</Text></Pressable>
    </View>}
  </View>;
}

export default function App() {
  const {width} = useWindowDimensions();
  const wide = width > 860;
  const [page,setPage] = useState<Page>('dashboard');
  const [events,setEvents] = useState<FestivalEvent[]>([]);
  const [search,setSearch] = useState('');
  const [filter,setFilter] = useState('TODOS');
  const [editing,setEditing] = useState<string | null>(null);
  const [artist,setArtist] = useState('');
  const [space,setSpace] = useState(stages[0]);
  const [time,setTime] = useState('21:45');
  const [status,setStatus] = useState<EventStatus>('CONFIRMED');
  const [notice,setNotice] = useState('');
  const [noticeError,setNoticeError] = useState(false);
  const [loginEmail,setLoginEmail] = useState('');
  const [loginPassword,setLoginPassword] = useState('');
  const [requiresPasswordChange,setRequiresPasswordChange] = useState(false);
  const [showLogin,setShowLogin] = useState(false);
  const [isSignedIn,setIsSignedIn] = useState(false);
  const [canManage,setCanManage] = useState(false);
  const [loading,setLoading] = useState(true);
  const [loadError,setLoadError] = useState(false);
  const [saving,setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      setLoading(true);
      try {
        await configureAmplify();
        const session = await fetchAuthSession();
        const items = await fetchEvents();
        if (active) {
          setIsSignedIn(Boolean(session.tokens?.accessToken));
          setCanManage(isAdminSession(session));
          setEvents(items);
        }
      } catch (error) {
        if (active) {
          setLoadError(true);
          setNotice(`No se pudo conectar con el backend: ${errorMessage(error)}`);
          setNoticeError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void initialize();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => events.filter(e => (filter === 'TODOS' || e.space === filter) && (e.artist.toLowerCase().includes(search.toLowerCase()) || e.code.toLowerCase().includes(search.toLowerCase()))),[events,search,filter]);
  const openNew = () => {setEditing(null);setArtist('');setSpace(stages[0]);setTime('21:45');setStatus('CONFIRMED');setNotice('');setNoticeError(false);setPage('form');};
  const openEdit = (e: FestivalEvent) => {setEditing(e.id);setArtist(e.artist);setSpace(e.space);setTime(e.time);setStatus(e.status);setNotice('');setNoticeError(false);setPage('form');};
  const requestNewEvent = () => {
    if (canManage) {
      openNew();
    } else if (isSignedIn) {
      setNotice('Esta cuenta no pertenece al grupo Admins.');
      setNoticeError(true);
    } else {
      setShowLogin(true);
    }
  };
  const reportError = (error: unknown) => {setNotice(errorMessage(error));setNoticeError(true);};

  const save = async () => {
    if(!artist.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)){setNotice('Introduce un artista y una hora válida (HH:MM).');setNoticeError(true);return;}
    if(!canManage){setNotice('Inicia sesión con una cuenta del grupo Admins para guardar cambios.');setNoticeError(true);setShowLogin(true);return;}
    setSaving(true);
    setNotice('');
    try {
      const values = {artist:artist.trim().toUpperCase(),space,time,status};
      const result = editing
        ? await client.models.FestivalEvent.update({id:editing,...values},{authMode:'userPool'})
        : await client.models.FestivalEvent.create({code:`EVT-${Date.now().toString().slice(-7)}`,...values},{authMode:'userPool'});
      throwIfErrors(result.errors);
      if (!result.data) throw new Error('El backend no devolvió el evento guardado.');
      const saved = result.data;
      setEvents(current => editing ? current.map(event => event.id === editing ? saved : event) : [saved,...current]);
      setNotice(editing?'Evento actualizado.':'Evento creado.');
      setNoticeError(false);
      setPage('events');
    } catch (error) {
      reportError(error);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (event: FestivalEvent) => {
    const nextStatus: EventStatus = event.status === 'CONFIRMED' ? 'DELAYED' : event.status === 'DELAYED' ? 'CANCELLED' : 'CONFIRMED';
    setSaving(true);
    setNotice('');
    try {
      const result = await client.models.FestivalEvent.update({id:event.id,status:nextStatus},{authMode:'userPool'});
      throwIfErrors(result.errors);
      if (!result.data) throw new Error('El backend no devolvió el evento actualizado.');
      const updated = result.data;
      setEvents(current => current.map(item => item.id === event.id ? updated : item));
      setNotice('Estado actualizado.');
      setNoticeError(false);
    } catch (error) {
      reportError(error);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setSaving(true);
    setNotice('');
    try {
      const result = await client.models.FestivalEvent.delete({id},{authMode:'userPool'});
      throwIfErrors(result.errors);
      if (!result.data) throw new Error('El backend no confirmó la eliminación.');
      setEvents(current => current.filter(event => event.id !== id));
      setNotice('Evento eliminado.');
      setNoticeError(false);
    } catch (error) {
      reportError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSignIn = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      setNotice('Introduce el correo y la contraseña del administrador.');
      setNoticeError(true);
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      if (requiresPasswordChange) {
        const result = await confirmSignIn({challengeResponse:loginPassword});
        if (!result.isSignedIn) throw new Error(`El inicio de sesión requiere un paso adicional (${result.nextStep.signInStep}).`);
      } else {
        const result = await signIn({username:loginEmail.trim(),password:loginPassword});
        if (!result.isSignedIn) {
          if (result.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
            setRequiresPasswordChange(true);
            setLoginPassword('');
            setNotice('La contraseña es temporal. Introduce una contraseña nueva para continuar.');
            setNoticeError(false);
            return;
          }
          throw new Error(`El inicio de sesión requiere un paso adicional (${result.nextStep.signInStep}).`);
        }
      }
      const session = await fetchAuthSession();
      const admin = isAdminSession(session);
      setIsSignedIn(true);
      setCanManage(admin);
      setShowLogin(false);
      setLoginPassword('');
      setRequiresPasswordChange(false);
      setNotice(admin ? 'Sesión de administrador iniciada.' : 'La cuenta no pertenece al grupo Admins y no puede gestionar eventos.');
      setNoticeError(!admin);
    } catch (error) {
      reportError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSaving(true);
    try {
      await signOut();
      setIsSignedIn(false);
      setCanManage(false);
      setRequiresPasswordChange(false);
      setPage('events');
      setNotice('Sesión cerrada.');
      setNoticeError(false);
    } catch (error) {
      reportError(error);
    } finally {
      setSaving(false);
    }
  };

  const confirmed = events.filter(e=>e.status==='CONFIRMED').length;
  const delayed = events.filter(e=>e.status==='DELAYED').length;
  const cardActions = (event: FestivalEvent) => ({
    canManage,
    disabled:saving,
    onEdit:()=>openEdit(event),
    onStatus:()=>{void changeStatus(event);},
    onDelete:()=>{void remove(event.id);},
  });

  return <SafeAreaView style={s.root}>
    <ScrollView contentContainerStyle={[s.container,wide&&{maxWidth:1160,alignSelf:'center',width:'100%'}]}>
      <View style={s.header}>
        <View><Text style={s.brand}>FESTIVAL CONTROL<Text style={{color:c.pink}}> /</Text></Text><Text style={s.kicker}>LIVE OPERATIONS · AWS AMPLIFY</Text></View>
        <View style={s.headerActions}>
          {isSignedIn && <Text style={[s.live,{color:canManage?c.green:c.amber}]}>{canManage?'● ADMIN':'● SIN PERMISOS'}</Text>}
          <Pressable accessibilityRole="button" disabled={saving} onPress={()=>{if(isSignedIn){void handleSignOut();}else{setShowLogin(value=>!value);setNotice('');setNoticeError(false);}}} style={s.authButton}>
            <Text style={s.actionText}>{isSignedIn?'CERRAR SESIÓN':'ACCESO ADMIN'}</Text>
          </Pressable>
        </View>
      </View>
      <View style={s.nav}>
        {([['dashboard','DASHBOARD'],['events','EVENTOS'],['form','+ NUEVO EVENTO']] as const).map(([key,label])=>
          <Pressable key={key} accessibilityRole="button" onPress={()=>key==='form'?requestNewEvent():setPage(key)} style={[s.navItem,page===key&&s.navActive]}><Text style={[s.navText,page===key&&{color:c.white}]}>{label}</Text></Pressable>)}
      </View>
      <View style={s.hero}>
        <Text style={s.heroTag}>ZARAGOZA · FESTIVAL OPERATIONS</Text>
        <Text style={[s.heroTitle,wide&&{fontSize:62}]}>THE NIGHT{ '\n' }IS YOURS.</Text>
        <Text style={s.heroSub}>Consulta la programación y guarda los cambios de forma persistente en AWS.</Text>
      </View>
      {showLogin && !isSignedIn && <View style={s.loginPanel}>
        <Text style={s.section}>ACCESO DE ADMINISTRADOR</Text>
        <Text style={s.subtitle}>Usa una cuenta invitada y añadida al grupo Cognito Admins.</Text>
        <TextInput accessibilityLabel="Correo de administrador" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Correo electrónico" placeholderTextColor="#777" style={s.input} value={loginEmail} onChangeText={setLoginEmail}/>
        <TextInput accessibilityLabel={requiresPasswordChange?'Nueva contraseña':'Contraseña'} autoComplete={requiresPasswordChange?'new-password':'password'} secureTextEntry placeholder={requiresPasswordChange?'Nueva contraseña':'Contraseña'} placeholderTextColor="#777" style={s.input} value={loginPassword} onChangeText={setLoginPassword}/>
        <Action label={saving?'CONECTANDO…':requiresPasswordChange?'CAMBIAR CONTRASEÑA':'INICIAR SESIÓN'} onPress={()=>{void handleSignIn();}} disabled={saving}/>
        <Action label="CANCELAR" onPress={()=>setShowLogin(false)} secondary disabled={saving}/>
      </View>}
      {page==='dashboard' && <>
        <Text style={s.section}>PANEL DE CONTROL</Text>
        <View style={[s.stats,wide&&{flexDirection:'row'}]}>
          {[[String(events.length).padStart(2,'0'),'EVENTOS',c.white],[String(confirmed).padStart(2,'0'),'CONFIRMADOS',c.green],[String(delayed).padStart(2,'0'),'RETRASADOS',c.amber],['04','ESCENARIOS',c.pink]].map(([num,label,color])=><View key={label} style={[s.stat,wide&&{flex:1}]}><Text style={[s.statNumber,{color}]}>{num}</Text><Text style={s.statLabel}>{label}</Text></View>)}
        </View>
        <View style={s.sectionRow}><Text style={s.section}>PRÓXIMOS EVENTOS</Text><Pressable onPress={()=>setPage('events')}><Text style={s.link}>VER TODOS →</Text></Pressable></View>
        {loading && <Text style={s.subtitle}>Cargando programación…</Text>}
        {!loading && events.slice(0,3).map(event=><EventCard key={event.id} event={event} {...cardActions(event)}/>)}
        {canManage && <Action label="＋ CREAR NUEVO EVENTO" onPress={openNew} disabled={saving}/>}
      </>}
      {page==='events' && <>
        <Text style={s.section}>PROGRAMACIÓN</Text>
        <Text style={s.subtitle}>{filtered.length} eventos · filtra y administra el festival</Text>
        <TextInput accessibilityLabel="Buscar artista o ID" placeholder="Buscar artista o ID..." placeholderTextColor="#777" style={s.input} value={search} onChangeText={setSearch}/>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
          {['TODOS',...stages].map(v=><Pressable key={v} onPress={()=>setFilter(v)} style={[s.filter,filter===v&&s.filterActive]}><Text style={s.filterText}>{v}</Text></Pressable>)}
        </ScrollView>
        {loading && <Text style={s.subtitle}>Cargando programación…</Text>}
        {!loading && !loadError && filtered.length===0&&<Text style={s.subtitle}>No hay eventos con ese filtro.</Text>}
        {!loading && filtered.map(event=><EventCard key={event.id} event={event} {...cardActions(event)}/>)}
        {canManage && <Action label="＋ NUEVO EVENTO" onPress={openNew} disabled={saving}/>}
      </>}
      {page==='form' && canManage && <>
        <Text style={s.section}>{editing?'EDITAR EVENTO':'NUEVO EVENTO'}</Text>
        <Text style={s.subtitle}>Completa los datos. Los cambios se guardan en AWS.</Text>
        <View style={s.form}>
          <Text style={s.label}>ARTISTA *</Text>
          <TextInput accessibilityLabel="Artista" placeholder="Ej. TECHNO TITANS" placeholderTextColor="#777" style={s.input} value={artist} onChangeText={setArtist}/>
          <Text style={s.label}>ESCENARIO</Text>
          <View style={s.choices}>{stages.map(v=><Pressable key={v} onPress={()=>setSpace(v)} style={[s.choice,space===v&&s.choiceActive]}><Text style={s.choiceText}>{v}</Text></Pressable>)}</View>
          <Text style={s.label}>HORA (HH:MM) *</Text>
          <TextInput accessibilityLabel="Hora" placeholder="21:45" placeholderTextColor="#777" style={s.input} value={time} onChangeText={setTime}/>
          <Text style={s.label}>ESTADO</Text>
          <View style={s.choices}>{statuses.map(v=><Pressable key={v} onPress={()=>setStatus(v)} style={[s.choice,status===v&&s.choiceActive]}><Text style={s.choiceText}>{v}</Text></Pressable>)}</View>
          <Action label={saving?'GUARDANDO…':editing?'GUARDAR CAMBIOS':'CREAR EVENTO'} onPress={()=>{void save();}} disabled={saving}/>
          <Action label="CANCELAR" secondary onPress={()=>setPage('events')} disabled={saving}/>
        </View>
      </>}
      {!!notice && <Text accessibilityRole="alert" style={[s.notice,noticeError&&s.noticeError]}>{notice}</Text>}
      <View style={s.footer}><Text style={s.footerText}>FESTIVAL CONTROL · EXPO WEB + AWS AMPLIFY GEN 2</Text><Text style={s.footerText}>LECTURA PÚBLICA · ESCRITURA PARA EL GRUPO ADMINS</Text></View>
    </ScrollView>
  </SafeAreaView>;
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.background},container:{padding:20,paddingBottom:60},
  header:{paddingTop:24,paddingBottom:22,flexDirection:'row',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10},
  headerActions:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:12},
  authButton:{backgroundColor:'#191919',paddingHorizontal:14,paddingVertical:11,borderRadius:10,borderWidth:1,borderColor:c.border},
  brand:{fontSize:20,fontWeight:'900',color:c.white,letterSpacing:1},kicker:{fontSize:10,color:c.muted,letterSpacing:2,marginTop:5},
  live:{color:c.green,fontSize:11,fontWeight:'900'},nav:{flexDirection:'row',flexWrap:'wrap',gap:9,marginBottom:18},
  navItem:{backgroundColor:'#191919',paddingHorizontal:15,paddingVertical:12,borderRadius:10,borderWidth:1,borderColor:c.border},
  navActive:{backgroundColor:c.pink,borderColor:c.pink},navText:{fontSize:11,fontWeight:'900',color:c.muted},
  hero:{backgroundColor:'#171018',borderColor:'#4C1934',borderWidth:1,borderRadius:22,padding:28,marginBottom:30},
  heroTag:{fontSize:11,color:c.pink,fontWeight:'900',letterSpacing:2,marginBottom:15},
  heroTitle:{fontSize:42,fontWeight:'900',color:c.white,lineHeight:51,letterSpacing:-1},
  heroSub:{color:'#B5B5B5',fontSize:14,marginTop:14,maxWidth:550,lineHeight:22},
  section:{fontSize:22,color:c.white,fontWeight:'900',marginBottom:15},sectionRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:14},
  link:{color:c.pink,fontSize:11,fontWeight:'900'},subtitle:{color:c.muted,marginBottom:18,lineHeight:22},
  stats:{gap:12,marginBottom:28},stat:{backgroundColor:c.card,borderRadius:16,borderColor:c.border,borderWidth:1,padding:22},
  statNumber:{fontSize:32,fontWeight:'900'},statLabel:{fontSize:11,fontWeight:'900',color:c.muted,marginTop:7,letterSpacing:1},
  card:{backgroundColor:c.card,borderWidth:1,borderColor:c.border,borderRadius:18,padding:20,marginBottom:14},
  cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
  time:{color:c.pink,fontSize:16,fontWeight:'900'},status:{fontSize:11,fontWeight:'900'},
  artist:{color:c.white,fontSize:26,fontWeight:'900',marginTop:12},space:{color:c.muted,fontSize:12,fontWeight:'700',marginTop:6},
  cardActions:{flexDirection:'row',flexWrap:'wrap',gap:20,borderTopWidth:1,borderTopColor:c.border,marginTop:19,paddingTop:17},
  actionText:{color:c.pink,fontSize:11,fontWeight:'900'},
  button:{backgroundColor:c.pink,borderRadius:12,padding:17,alignItems:'center',marginTop:12},
  buttonSecondary:{backgroundColor:'#292929'},buttonDanger:{backgroundColor:'#632233'},buttonText:{color:c.white,fontWeight:'900',fontSize:12},
  input:{backgroundColor:'#171717',color:c.white,borderRadius:12,borderWidth:1,borderColor:'#383838',padding:16,marginBottom:18,fontSize:15},
  filters:{gap:8,paddingBottom:16},filter:{backgroundColor:'#242424',borderRadius:9,padding:11},filterActive:{backgroundColor:c.pink},
  filterText:{color:c.white,fontSize:10,fontWeight:'900'},form:{maxWidth:650,width:'100%'},loginPanel:{maxWidth:650,width:'100%',marginBottom:30},
  label:{color:c.muted,fontWeight:'900',fontSize:11,letterSpacing:1,marginBottom:8},
  choices:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:18},choice:{padding:12,borderWidth:1,borderColor:c.border,backgroundColor:c.card,borderRadius:9},
  choiceActive:{backgroundColor:'#7B1947',borderColor:c.pink},choiceText:{color:c.white,fontSize:11,fontWeight:'800'},
  notice:{marginTop:22,color:c.green,fontWeight:'800'},noticeError:{color:c.red},footer:{borderTopWidth:1,borderTopColor:c.border,marginTop:38,paddingTop:20,gap:7},
  footerText:{fontSize:10,color:'#777',letterSpacing:1}
});
