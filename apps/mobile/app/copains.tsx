import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Text, TextInput, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { breedInfo } from "@stanandwill/core";
import { useStore } from "../lib/store";
import { supabaseConfigured } from "../lib/supabase";
import * as S from "../lib/social";
import { Button, Card, Choice, H1, H2, P, Pill, Small } from "../components/ui";
import { colors, fonts, radius } from "../lib/theme";

type View3 = "pres" | "demandes" | "balades";
const SIZE_LABEL: Record<string, string> = { toy: "très petit", small: "petit", medium: "moyen", large: "grand" };

/**
 * Copains de balade : trouver des maîtres à proximité (position arrondie au km, opt-in),
 * envoyer un « coucou », accepter, proposer une balade à plusieurs.
 * Modération minimale : décliner / bloquer / signaler.
 */
export default function Copains() {
  const router = useRouter();
  const { session, dogs, dog } = useStore();
  const [profile, setProfile] = useState<S.WalkProfile | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<View3>("pres");
  const [near, setNear] = useState<S.Nearby[]>([]);
  const [reqs, setReqs] = useState<{ me: string; items: S.WalkRequest[] }>({ me: "", items: [] });
  const [meetups, setMeetups] = useState<S.Meetup[]>([]);
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState<Record<string, { visible: boolean; temperament: string[] }>>({});

  const load = useCallback(async () => {
    if (!session || !supabaseConfigured) { setProfile(null); return; }
    try {
      const p = await S.getMyProfile(); setProfile(p);
      if (p) {
        const [n, r, m, pd] = await Promise.all([S.nearby(p.radius_km), S.listRequests(), S.listMeetups(), S.myPublishedDogs()]);
        setNear(n); setReqs(r); setMeetups(m); setPublished(pd);
      }
    } catch (e: any) { Alert.alert("Chargement impossible", e?.message ?? String(e)); setProfile(null); }
  }, [session]);
  useEffect(() => { load(); }, [load]);

  const back = <Pressable onPress={() => router.back()} style={{ marginBottom: 8 }}><Small style={{ color: colors.foret, fontFamily: fonts.bold }}>← Balades</Small></Pressable>;

  if (!supabaseConfigured || !session) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}><ScrollView contentContainerStyle={s.body}>
        {back}<H1>Copains de balade</H1>
        <Card style={{ marginTop: 16 }}>
          <P>Pour voir les maîtres près de chez vous et proposer des balades, il faut un compte (gratuit, e-mail seulement).</P>
          <P style={{ marginTop: 8 }}>Ce que les autres verront : votre prénom, votre commune, les créneaux où vous sortez, et la fiche de vos chiens. Jamais votre adresse ni votre e-mail.</P>
          <View style={{ marginTop: 14 }}><Button title="Créer mon compte" onPress={() => router.push("/(onboarding)/auth")} /></View>
        </Card>
      </ScrollView></SafeAreaView>
    );
  }

  if (profile === undefined) return <SafeAreaView style={s.safe}><View style={s.body}><Small>Chargement…</Small></View></SafeAreaView>;

  if (!profile || editing) {
    return <ProfileForm initial={profile} dogs={dogs.map((d) => d.dog)} published={published} onDone={async () => { setEditing(false); await load(); }} back={back} />;
  }

  const incoming = reqs.items.filter((r) => r.to_user === reqs.me && r.status === "pending");
  const outgoing = reqs.items.filter((r) => r.from_user === reqs.me && r.status === "pending");
  const friends = reqs.items.filter((r) => r.status === "accepted");

  const coucou = (n: S.Nearby) => {
    const send = (msg: string) => S.sendRequest(n.user_id, msg).then(load).catch((e: any) => Alert.alert("Envoi impossible", e?.message));
    if (Platform.OS === "ios") Alert.prompt("Dire bonjour", `Un mot pour ${n.display_name} (facultatif)`, (msg) => send(msg ?? ""));
    else Alert.alert("Dire bonjour", `Envoyer un bonjour à ${n.display_name} ?`, [{ text: "Annuler", style: "cancel" }, { text: "Envoyer", onPress: () => send("") }]);
  };

  const report = (userId: string) => Alert.alert("Signaler ce maître", "Pourquoi ?", [
    { text: "Spam", onPress: () => S.reportUser(userId, "spam") }, { text: "Comportement", onPress: () => S.reportUser(userId, "harassment") },
    { text: "Faux profil", onPress: () => S.reportUser(userId, "fake") }, { text: "Annuler", style: "cancel" },
  ]);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.body}>
        {back}
        <View style={s.row}>
          <H1 style={{ flex: 1 }}>Copains de balade</H1>
          <Pressable onPress={() => setEditing(true)}><Small style={{ color: colors.foret, fontFamily: fonts.bold }}>Mon profil</Small></Pressable>
        </View>
        <Small style={{ marginTop: 4 }}>{profile.display_name} · {profile.city ?? "commune inconnue"} · rayon {profile.radius_km} km · {profile.visible ? "visible" : "masqué"}</Small>

        <View style={s.seg}>
          {(["pres", "demandes", "balades"] as View3[]).map((v) => (
            <Pressable key={v} onPress={() => setView(v)} style={[s.segBtn, view === v && s.segOn]}>
              <Text style={[s.segTxt, view === v && { color: colors.blanc }]}>{v === "pres" ? "À proximité" : v === "demandes" ? `Demandes${incoming.length ? ` (${incoming.length})` : ""}` : "Balades prévues"}</Text>
            </Pressable>
          ))}
        </View>

        {view === "pres" && (
          <>
            {near.length === 0 && <Card style={{ marginTop: 12 }}><P>Personne dans votre rayon pour l'instant. Élargissez le rayon dans « Mon profil », ou invitez les maîtres que vous croisez : plus on est, plus c'est utile.</P></Card>}
            {near.map((n) => (
              <Card key={n.user_id} style={{ marginTop: 12 }}>
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <H2>{n.display_name}</H2>
                    <Small>{n.city ?? "—"} · à ~{n.distance_km} km{n.slots.length ? ` · ${n.slots.map((x) => S.SLOTS.find((y) => y.id === x)?.label).join(", ")}` : ""}</Small>
                  </View>
                  <Pressable onPress={() => report(n.user_id)}><Small>⋯</Small></Pressable>
                </View>
                {n.bio && <P style={{ marginTop: 6 }}>{n.bio}</P>}
                <View style={[s.row, { flexWrap: "wrap", gap: 6, marginTop: 8 }]}>
                  {n.dogs.map((d) => <Pill key={d.dog_id} label={`${d.name} · ${breedInfo(d.breed_id).label} · ${SIZE_LABEL[d.size_class] ?? d.size_class}${d.age_band === "puppy" ? " · chiot" : d.age_band === "senior" ? " · senior" : ""}`} />)}
                </View>
                <View style={{ marginTop: 12 }}>
                  {n.friend_status === "accepted" ? <Pill label="✓ Copains" tone="bon" /> : n.friend_status === "pending" ? <Pill label="Demande en attente" tone="miel" /> : <Button title={`Dire bonjour à ${n.display_name}`} variant="secondary" onPress={() => coucou(n)} />}
                </View>
              </Card>
            ))}
          </>
        )}

        {view === "demandes" && (
          <>
            {incoming.length === 0 && outgoing.length === 0 && friends.length === 0 && <Card style={{ marginTop: 12 }}><P>Aucune demande pour l'instant.</P></Card>}
            {incoming.map((r) => (
              <Card key={r.id} style={{ marginTop: 12 }}>
                <H2>{r.from_name} vous dit bonjour</H2>
                {r.message && <P style={{ marginTop: 4 }}>« {r.message} »</P>}
                <View style={[s.row, { gap: 8, marginTop: 12 }]}>
                  <View style={{ flex: 1 }}><Button title="Accepter" onPress={() => S.respondRequest(r.id, "accepted").then(load)} /></View>
                  <View style={{ flex: 1 }}><Button title="Décliner" variant="secondary" onPress={() => S.respondRequest(r.id, "declined").then(load)} /></View>
                </View>
                <Pressable onPress={() => S.respondRequest(r.id, "blocked").then(load)} style={{ marginTop: 8 }}><Small style={{ color: colors.urgence }}>Bloquer ce maître</Small></Pressable>
              </Card>
            ))}
            {outgoing.map((r) => <Card key={r.id} style={{ marginTop: 12 }}><P>Bonjour envoyé à {r.to_name}</P><Small>En attente de réponse</Small></Card>)}
            {friends.length > 0 && <H2 style={{ marginTop: 18 }}>Mes copains</H2>}
            {friends.map((r) => <Card key={r.id} style={{ marginTop: 8, paddingVertical: 12 }}><P style={{ fontFamily: fonts.bold }}>{r.from_user === reqs.me ? r.to_name : r.from_name}</P></Card>)}
          </>
        )}

        {view === "balades" && <MeetupsView meetups={meetups} profile={profile} onChange={load} busy={busy} setBusy={setBusy} dogName={dog?.name ?? "mon chien"} />}

        <Small style={{ marginTop: 24, textAlign: "center" }}>Position arrondie au kilomètre, jamais votre adresse. Vous pouvez vous masquer ou tout supprimer depuis « Mon profil ».</Small>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileForm({ initial, dogs, published, onDone, back }: { initial: S.WalkProfile | null; dogs: { id: string; name: string; breed_id: string; size?: string | null; weightKg?: number | null; sex?: any; birth_month?: string | null; conditions: string[]; neutered: any }[]; published: Record<string, { visible: boolean; temperament: string[] }>; onDone: () => Promise<void>; back: React.ReactNode }) {
  const [name, setName] = useState(initial?.display_name ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(initial?.lat_approx != null && initial?.lng_approx != null ? { lat: Number(initial.lat_approx), lng: Number(initial.lng_approx) } : null);
  const [radius, setRadius] = useState(initial?.radius_km ?? 5);
  const [slots, setSlots] = useState<S.Slot[]>(initial?.slots ?? []);
  const [visible, setVisible] = useState(initial?.visible ?? true);
  const [temps, setTemps] = useState<Record<string, string[]>>(() => Object.fromEntries(dogs.map((d) => [d.id, published[d.id]?.temperament ?? []])));
  const [showDogs, setShowDogs] = useState<Record<string, boolean>>(() => Object.fromEntries(dogs.map((d) => [d.id, published[d.id]?.visible ?? true])));
  const [busy, setBusy] = useState(false);

  const locate = async () => {
    setBusy(true);
    const l = await S.approximateLocation();
    setBusy(false);
    if (!l) { Alert.alert("Position indisponible", "Autorisez la localisation (approximative suffit) ou indiquez simplement votre commune."); return; }
    setPos({ lat: l.lat, lng: l.lng }); if (l.city && !city) setCity(l.city);
  };

  const save = async () => {
    if (name.trim().length < 2) { Alert.alert("Prénom", "Indiquez un prénom ou un pseudo (2 lettres minimum)."); return; }
    if (!pos) { Alert.alert("Position", "Appuyez sur « Me situer » : seule une position arrondie au kilomètre est enregistrée."); return; }
    setBusy(true);
    try {
      await S.saveProfile({ display_name: name.trim(), bio: bio.trim() || null, city: city.trim() || null, lat_approx: pos.lat, lng_approx: pos.lng, radius_km: radius, slots, visible });
      for (const d of dogs) {
        if (d.id.startsWith("local-")) continue; // sera publié après synchro du chien
        await S.publishDog(d as any, temps[d.id] ?? [], showDogs[d.id] ?? true).catch(() => {});
      }
      await onDone();
    } catch (e: any) { Alert.alert("Enregistrement impossible", e?.message ?? String(e)); }
    setBusy(false);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {back}<H1>{initial ? "Mon profil copains" : "Rejoindre les copains de balade"}</H1>
        <Small style={{ marginTop: 4 }}>Visible par les autres maîtres : prénom, commune, créneaux, fiche des chiens. Rien d'autre.</Small>
        <Card style={{ marginTop: 16, gap: 10 }}>
          <TextInput value={name} onChangeText={setName} placeholder="Votre prénom ou pseudo" placeholderTextColor={colors.texteDoux} style={s.input} maxLength={24} />
          <TextInput value={bio} onChangeText={setBio} placeholder="Une phrase (facultatif) : « Balades tranquilles le matin au bord de mer »" placeholderTextColor={colors.texteDoux} style={[s.input, { minHeight: 70 }]} multiline maxLength={140} />
          <View style={[s.row, { gap: 8 }]}>
            <TextInput value={city} onChangeText={setCity} placeholder="Commune" placeholderTextColor={colors.texteDoux} style={[s.input, { flex: 1 }]} maxLength={60} />
            <Button title={pos ? "Situé ✓" : "Me situer"} variant="secondary" onPress={locate} loading={busy} />
          </View>
          <Small>Rayon de recherche : {radius} km</Small>
          <View style={[s.row, { gap: 6 }]}>{[2, 5, 10, 20, 30].map((r) => <Pressable key={r} onPress={() => setRadius(r)} style={[s.chip, radius === r && s.chipOn]}><Text style={[s.chipTxt, radius === r && { color: colors.blanc }]}>{r} km</Text></Pressable>)}</View>
          <Small>Quand sortez-vous le plus souvent ?</Small>
          <View style={[s.row, { gap: 6, flexWrap: "wrap" }]}>{S.SLOTS.map((sl) => <Pressable key={sl.id} onPress={() => setSlots((v) => v.includes(sl.id) ? v.filter((x) => x !== sl.id) : [...v, sl.id])} style={[s.chip, slots.includes(sl.id) && s.chipOn]}><Text style={[s.chipTxt, slots.includes(sl.id) && { color: colors.blanc }]}>{sl.label}</Text></Pressable>)}</View>
        </Card>

        <H2 style={{ marginTop: 18 }}>Mes chiens</H2>
        {dogs.map((d) => (
          <Card key={d.id} style={{ marginTop: 10 }}>
            <View style={s.row}>
              <P style={{ flex: 1, fontFamily: fonts.bold }}>{d.name} · {breedInfo(d.breed_id).label}</P>
              <Pressable onPress={() => setShowDogs((v) => ({ ...v, [d.id]: !v[d.id] }))}><Pill label={showDogs[d.id] ? "Visible" : "Masqué"} tone={showDogs[d.id] ? "bon" : "sauge"} /></Pressable>
            </View>
            {d.id.startsWith("local-") && <Small style={{ marginTop: 4 }}>Sera publié dès que la fiche est synchronisée avec votre compte.</Small>}
            <View style={[s.row, { gap: 6, flexWrap: "wrap", marginTop: 8 }]}>
              {S.TEMPERAMENTS.map((t) => { const on = (temps[d.id] ?? []).includes(t.id); return <Pressable key={t.id} onPress={() => setTemps((v) => ({ ...v, [d.id]: on ? (v[d.id] ?? []).filter((x) => x !== t.id) : [...(v[d.id] ?? []), t.id] }))} style={[s.chip, on && s.chipOn]}><Text style={[s.chipTxt, on && { color: colors.blanc }]}>{t.label}</Text></Pressable>; })}
            </View>
          </Card>
        ))}

        <Pressable onPress={() => setVisible((v) => !v)} style={[s.row, { gap: 10, marginTop: 16 }]}>
          <View style={[s.box, visible && s.boxOn]}>{visible && <Text style={{ color: colors.blanc, fontSize: 12, fontFamily: fonts.black }}>✓</Text>}</View>
          <Small style={{ flex: 1 }}>Je suis visible des maîtres à proximité (décochez pour vous masquer sans rien perdre)</Small>
        </Pressable>
        <View style={{ marginTop: 16 }}><Button title={initial ? "Enregistrer" : "Rejoindre"} onPress={save} loading={busy} /></View>
        {initial && <Pressable onPress={async () => { await S.saveProfile({ ...initial, visible: false, lat_approx: null, lng_approx: null } as any); await onDone(); }} style={{ marginTop: 14 }}><Small style={{ color: colors.urgence, textAlign: "center" }}>Me retirer des copains de balade (position effacée)</Small></Pressable>}
      </ScrollView>
    </SafeAreaView>
  );
}

function MeetupsView({ meetups, profile, onChange, busy, setBusy, dogName }: { meetups: S.Meetup[]; profile: S.WalkProfile; onChange: () => Promise<void>; busy: boolean; setBusy: (b: boolean) => void; dogName: string }) {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [when, setWhen] = useState<"demain-matin" | "demain-soir" | "samedi-matin" | "dimanche-matin">("demain-matin");
  const [openTo, setOpenTo] = useState<"friends" | "nearby">("nearby");

  const startsAt = () => {
    const d = new Date(); d.setSeconds(0, 0);
    if (when.startsWith("demain")) { d.setDate(d.getDate() + 1); d.setHours(when === "demain-matin" ? 9 : 18, 0); }
    else { const target = when === "samedi-matin" ? 6 : 0; const delta = (target - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + delta); d.setHours(10, 0); }
    return d.toISOString();
  };

  const create = async () => {
    if (title.trim().length < 3 || !place.trim()) { Alert.alert("Il manque un titre ou un lieu", "Ex. « Balade digestive » au « Parc Charruyer, entrée nord »."); return; }
    setBusy(true);
    try { await S.createMeetup({ title: title.trim(), place_label: place.trim(), starts_at: startsAt(), open_to: openTo, lat: profile.lat_approx, lng: profile.lng_approx }); setCreating(false); setTitle(""); setPlace(""); await onChange(); }
    catch (e: any) { Alert.alert("Création impossible", e?.message); }
    setBusy(false);
  };

  return (
    <>
      {!creating && <View style={{ marginTop: 12 }}><Button title={`Proposer une balade avec ${dogName}`} onPress={() => setCreating(true)} /></View>}
      {creating && (
        <Card style={{ marginTop: 12, gap: 10 }}>
          <TextInput value={title} onChangeText={setTitle} placeholder="Titre : « Balade du dimanche »" placeholderTextColor={colors.texteDoux} style={s.input} maxLength={80} />
          <TextInput value={place} onChangeText={setPlace} placeholder="Lieu de rendez-vous (parc, plage, entrée…)" placeholderTextColor={colors.texteDoux} style={s.input} maxLength={120} />
          <Small>Quand ?</Small>
          <View style={{ gap: 6 }}>
            {([["demain-matin", "Demain matin (9 h)"], ["demain-soir", "Demain soir (18 h)"], ["samedi-matin", "Samedi matin (10 h)"], ["dimanche-matin", "Dimanche matin (10 h)"]] as const).map(([k, l]) => <Choice key={k} label={l} selected={when === k} onPress={() => setWhen(k)} />)}
          </View>
          <Small>Qui peut voir ?</Small>
          <View style={[s.row, { gap: 6 }]}>
            <Pressable onPress={() => setOpenTo("nearby")} style={[s.chip, openTo === "nearby" && s.chipOn]}><Text style={[s.chipTxt, openTo === "nearby" && { color: colors.blanc }]}>Maîtres à proximité</Text></Pressable>
            <Pressable onPress={() => setOpenTo("friends")} style={[s.chip, openTo === "friends" && s.chipOn]}><Text style={[s.chipTxt, openTo === "friends" && { color: colors.blanc }]}>Mes copains seulement</Text></Pressable>
          </View>
          <View style={[s.row, { gap: 8 }]}>
            <View style={{ flex: 1 }}><Button title="Publier" onPress={create} loading={busy} /></View>
            <Button title="Annuler" variant="ghost" onPress={() => setCreating(false)} />
          </View>
        </Card>
      )}
      {meetups.length === 0 && !creating && <Card style={{ marginTop: 12 }}><P>Aucune balade prévue à proximité. Lancez la première : le lieu et l'heure suffisent.</P></Card>}
      {meetups.map((m) => (
        <Card key={m.id} style={{ marginTop: 12 }}>
          <View style={s.row}>
            <H2 style={{ flex: 1 }}>{m.title}</H2>
            {m.mine && <Pill label="Vous organisez" tone="miel" />}
          </View>
          <P style={{ marginTop: 4 }}>{new Date(m.starts_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {new Date(m.starts_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</P>
          <Small>{m.place_label} · {m.going ?? 0} maître{(m.going ?? 0) > 1 ? "s" : ""} · {m.open_to === "friends" ? "copains" : "ouvert à proximité"}</Small>
          {!m.mine && <View style={{ marginTop: 10 }}><Button title={m.joined ? "Je ne viens plus" : "J'y serai"} variant={m.joined ? "ghost" : "secondary"} onPress={() => S.joinMeetup(m.id, !m.joined).then(onChange)} /></View>}
        </Card>
      ))}
    </>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.creme },
  body: { padding: 20, paddingBottom: 40 },
  row: { flexDirection: "row", alignItems: "center" },
  seg: { flexDirection: "row", backgroundColor: colors.saugeClair, borderRadius: radius.md, padding: 4, marginTop: 14 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: "center" },
  segOn: { backgroundColor: colors.foret },
  segTxt: { fontFamily: fonts.bold, fontSize: 13, color: colors.foretFonce },
  input: { borderWidth: 1.5, borderColor: colors.ligne, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, minHeight: 50, fontFamily: fonts.regular, fontSize: 16, color: colors.texte, backgroundColor: colors.blanc },
  chip: { borderWidth: 1.5, borderColor: colors.ligne, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: colors.blanc },
  chipOn: { backgroundColor: colors.foret, borderColor: colors.foret },
  chipTxt: { fontFamily: fonts.bold, fontSize: 13, color: colors.foretFonce },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.sauge, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: colors.foret, borderColor: colors.foret },
});
