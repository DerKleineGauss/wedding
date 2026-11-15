import type { ImageMetadata } from "astro";
import wald from "@/assets/img/ruegen/wald.jpg";
import moos from "@/assets/img/ruegen/moos.jpg";
import koenigsstuhl from "@/assets/img/ruegen/koenigsstuhl.jpg";
import baumwipfelpfad from "@/assets/img/ruegen/baumwipfelpfad.jpg";
import arkona from "@/assets/img/ruegen/arkona.jpg";
import kueste from "@/assets/img/ruegen/kueste.jpg";
import huehnergott from "@/assets/img/ruegen/huehnergott.jpg";
import findlinge from "@/assets/img/ruegen/findlinge.jpg";
import binz from "@/assets/img/ruegen/binz.jpg";
import sandstrand from "@/assets/img/ruegen/sandstrand.jpg";
import baden from "@/assets/img/ruegen/baden.jpg";
import strandkorb from "@/assets/img/ruegen/strandkorb.jpg";
import strandkonzert from "@/assets/img/ruegen/strandkonzert.jpg";
import strandbar from "@/assets/img/ruegen/strandbar.jpg";
import regenbogen from "@/assets/img/ruegen/regenbogen.jpg";
import regen from "@/assets/img/ruegen/regen.jpg";
import lasertag from "@/assets/img/ruegen/lasertag.jpg";
import quad from "@/assets/img/ruegen/quad.jpg";
import bowling from "@/assets/img/ruegen/bowling.jpg";
import segeln from "@/assets/img/ruegen/segeln.jpg";
import stralsund from "@/assets/img/ruegen/stralsund.jpg";
import walskelett from "@/assets/img/ruegen/walskelett.jpg";
import kuchen from "@/assets/img/ruegen/kuchen.jpg";
import hafen from "@/assets/img/ruegen/hafen.jpg";

export const CATEGORIES = ["Natur", "Strand", "Action", "Ausflug", "Regentag", "Genuss"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Tip {
  id: string;
  cat: Category;
  title: string;
  /** Nur wenn der Ort sicher ist. */
  place?: string;
  tip: string;
  alt: string;
  img: ImageMetadata;
  /** object-position für den Bildausschnitt, Standard "50% 45%". */
  pos?: string;
  /** "top", wenn das Motiv unten im Bild liegt und der Text es sonst verdecken würde. */
  text?: "top";
}

/** Fotos aus website/img (Rohdaten, HEIC), bearbeitet nach src/assets/img/ruegen. */
export const tips: Tip[] = [
  {
    id: "moos", cat: "Natur", title: "Barfuß aufs Moos", place: "Goor bei Lauterbach", img: moos, pos: "45% 35%",
    tip: "Unser Tipp für einen Waldspaziergang: die Goor bei Lauterbach. Alte Buchen, zwischendurch glitzert der Bodden, und überall liegt dieses super weiche Moos. Einmal draufstehen, und man will nie wieder Teppich.",
    alt: "Wir beide lachend im Buchenwald, sie steht auf weichen Moospolstern",
  },
  {
    id: "koenigsstuhl", cat: "Natur", title: "Kreidefelsen am Königsstuhl", place: "Nationalpark Jasmund", img: koenigsstuhl, pos: "50% 50%",
    tip: "Der Königsstuhl ist der berühmteste Kreidefelsen der Insel, mit Skywalk und Nationalpark-Zentrum. Früh kommen, mittags wird es voll. Wem es zu voll ist: Man kann auch wunderbar den Hochuferweg entlang spazieren. Die Viktoriasicht ist ohnehin viel dramatischer.",
    alt: "Weiße Kreidefelsen über einem schmalen Strand, im Vordergrund grünes Laub",
  },
  {
    id: "kueste", cat: "Natur", title: "Die Küste ablaufen", img: kueste, pos: "40% 40%",
    tip: "Unten am Wasser kann man stundenlang über Steine, Sand und Wiesen laufen, an jeder Ecke sieht die Küste anders aus. Steine gucken, Füße ins Wasser, weiterlaufen.",
    alt: "Lächelnde Frau an einer grünen Steilküste mit Steinen im Wasser",
  },
  {
    id: "huehnergott", cat: "Natur", title: "Hühnergott suchen", img: huehnergott, pos: "50% 40%",
    tip: "Feuersteine mit natürlichem Loch heißen hier Hühnergott und sollen Glück bringen. Mit etwas Geduld findet man auch Donnerkeile: versteinerte Reste von Belemniten, kleinen Tintenfisch-Verwandten aus der Kreidezeit.",
    alt: "Frau hockt am Kieselstrand und zeigt einen Stein in der Hand",
  },
  {
    id: "findlinge", cat: "Strand", title: "Tanzen auf Findlingen", img: findlinge, pos: "50% 55%",
    tip: "Nicht jeder Strand ist Sand. An vielen Stellen liegen große Findlinge im flachen Wasser: gut zum Balancieren, Tanzen und für dramatische Fotos. Badeschuhe helfen.",
    alt: "Wir beide tanzen auf einem großen Stein im flachen Wasser",
  },
  {
    id: "baumwipfelpfad", cat: "Ausflug", title: "Baumwipfelpfad", place: "Prora", img: baumwipfelpfad, pos: "50% 40%",
    tip: "Im Naturerbe Zentrum Rügen führt ein Holzpfad durch die Baumkronen bis auf einen Aussichtsturm. Oben liegt einem der Bodden zu Füßen, und abends färbt sich der Himmel stets genau wie auf dem Foto.",
    alt: "Blick von oben über dunklen Wald auf den Bodden, Abendhimmel mit Schäfchenwolken",
  },
  {
    id: "arkona", cat: "Ausflug", title: "Kap Arkona", place: "Kap Arkona", img: arkona, pos: "50% 55%",
    tip: "Die Nordspitze mit zwei Leuchttürmen. Oben vom Leuchtturm überblickt man das ganze Kap und sehr viel Ostsee. Danach runter ins Fischerdorf Vitt. Dort gibt es schöne Handwerkerkunst.",
    alt: "Blick von oben auf Wege, Bäume und Wiese am Kap, dahinter die Ostsee",
  },
  {
    id: "binz", cat: "Ausflug", title: "Seebrücke Binz", place: "Ostseebad Binz", img: binz, pos: "50% 60%",
    tip: "Weiße Bäderarchitektur, lange Promenade, Seebrücke. Binz ist der Klassiker: im August voll, abends aber herrlich zum Bummeln und Eisessen. Und: bislang hat noch jeder sein Handtuch ausbreiten können.",
    alt: "Seebrücke mit Schild „Seebad Binz“ bei tief stehender Sonne",
  },
  {
    id: "sandstrand", cat: "Strand", title: "Kilometer Sand", img: sandstrand, pos: "50% 35%",
    tip: "Die Ostseite der Insel hat lange, feine Sandstrände, die flach ins Wasser laufen. Augen zu, Gesicht in die Sonne, fertig ist der Urlaub.",
    alt: "Frau mit geschlossenen Augen im Wind an einem breiten Sandstrand",
  },
  {
    id: "baden", cat: "Strand", title: "Anbaden", img: baden,
    tip: "Die Ostsee hat im August meist um die 18 bis 20 Grad. Die einen sagen erfrischend, die anderen Mutprobe. Die flachen Bodden sind oft etwas wärmer.",
    alt: "Frau watet im flachen, klaren Wasser, im Hintergrund eine bewaldete Landzunge",
  },
  {
    id: "strandkorb", cat: "Strand", title: "Strandkorb und Wolken", img: strandkorb, pos: "100% 100%", text: "top",
    tip: "Der Strandkorb ist Rügens Antwort auf Wind: mieten, reinsetzen, Wolken gucken. An den meisten Badestränden gibt es Körbe für den Tag.",
    alt: "Blauer Himmel mit großen Federwolken, unten rechts ein Strandkorb",
  },
  {
    id: "strandkonzert", cat: "Strand", title: "Musik im Sand", img: strandkonzert, pos: "50% 60%",
    tip: "Im Sommer gibt es in den Badeorten Konzerte direkt am Strand. Schuhe aus, Decke mit, fertig. Termine stehen bei den Kurverwaltungen.",
    alt: "Schuhe und Handtücher im Sand vor einer kleinen Bühne mit Band",
  },
  {
    id: "strandbar", cat: "Genuss", title: "Sundowner", img: strandbar,
    tip: "Wenn die Sonne tiefer steht: Füße in den Sand, etwas Kaltes in die Hand. Gern mit Blick aufs Wasser, bis die Sonne weg ist.",
    alt: "Rosa Getränk mit Strohhalm auf einem Holztisch, dahinter der Strand",
  },
  {
    id: "lasertag", cat: "Action", title: "Lasertag in Prora", place: "Prora", img: lasertag, pos: "50% 50%",
    tip: "In Prora kann man mit neumodischen, ungefährlichen Waffen Krieg spielen. Ideal für Teambuilding unter Trauzeugen und zum Begleichen alter Rechnungen.",
    alt: "Drei Leute mit Lasertag-Ausrüstung in einer Kulisse aus Holz",
  },
  {
    id: "quad", cat: "Action", title: "Quad fahren", place: "Rugard-Wald, Bergen", img: quad, pos: "50% 65%",
    tip: "Auf abgesperrten Sandpisten Quad fahren: laut, staubig, großartig. Danach braucht man dringend einen Sprung in die Ostsee.",
    alt: "Zwei Quads auf einer Sandpiste vor einem Kiefernwald",
  },
  {
    id: "segeln", cat: "Action", title: "Segeln auf dem Bodden", img: segeln, pos: "50% 40%",
    tip: "Rund um Rügen kann man Boote chartern oder bei einem Skipper mitfahren. Auf den Bodden ist es ruhiger als auf der offenen Ostsee, also auch was für Landratten.",
    alt: "Junger Mensch mit Sonnenbrille am Steuer eines Segelboots",
  },
  {
    id: "stralsund", cat: "Ausflug", title: "Ausflug nach Stralsund", place: "Stralsund", img: stralsund, pos: "45% 45%",
    tip: "Gleich hinter der Brücke: Backsteingotik, Altstadt mit UNESCO-Welterbe und im Hafen die Gorch Fock I zum Besichtigen. Wer jemanden über die Schwelle tragen will, kann hier üben.",
    alt: "Er trägt sie auf den Armen, dahinter ein weißer Großsegler im Hafen",
  },
  {
    id: "walskelett", cat: "Regentag", title: "Wale gucken (drinnen)", place: "Stralsund", img: walskelett, pos: "50% 40%",
    tip: "Im Ozeaneum und im Meeresmuseum hängen Wale unter der Decke. Unser Highlight sind aber die stattlichen Meeresschildkröten. Perfekt für Regentage.",
    alt: "Selfie unter einem Walskelett im Museum",
  },
  {
    id: "bowling", cat: "Regentag", title: "Bowling bei Schietwetter", img: bowling,
    tip: "Wenn der Himmel gar nicht will: ab auf die Bahn. Punkte zählen ist optional, Jubeln über jeden umgefallenen Pin nicht.",
    alt: "Bowlingbahn mit Meeresmotiv an der Wand, jemand wirft gerade",
  },
  {
    id: "wald", cat: "Natur", title: "Buchenwald im Nebel", img: wald,
    tip: "Die alten Buchenwälder im Nationalpark Jasmund sind UNESCO-Weltnaturerbe. Das Foto ist in der kahlen Jahreszeit entstanden: Im August ist hier alles sattgrün und das Blätterdach fast geschlossen. Früh morgens hängt manchmal trotzdem Nebel zwischen den Stämmen, dann sieht es aus wie im Märchen.",
    alt: "Hohe, kahle Buchen im dichten Nebel",
  },
  {
    id: "regen", cat: "Regentag", title: "Regenjacke einpacken", img: regen, pos: "50% 35%",
    tip: "Auch im August kann es regnen. Dann eben Kapuze auf und trotzdem raus: Wald und Küste sind bei Regen fast noch schöner. Fast.",
    alt: "Wir beide mit Kapuzen im Regen, sie in gepunkteter Regenjacke",
  },
  {
    id: "regenbogen", cat: "Regentag", title: "Danach: Regenbogen", img: regenbogen, pos: "50% 30%",
    tip: "Das Wetter auf Rügen wechselt schnell. Nach dem Schauer kommt oft der Regenbogen, also Kamera griffbereit halten.",
    alt: "Wir beide lachend am Strand, hinter uns ein Regenbogen",
  },
  {
    id: "hafen", cat: "Ausflug", title: "Hafen gucken", img: hafen, pos: "50% 30%",
    tip: "Boote gucken, Möwen zuhören, über die Mole schlendern. Den Wind gibt es gratis dazu, die Frisur danach auch.",
    alt: "Mann mit vom Wind zerzausten Haaren am Hafen",
  },
  {
    id: "kuchen", cat: "Genuss", title: "Kuchen, unbedingt", img: kuchen, pos: "35% 90%", text: "top",
    tip: "Fast jedes Dorf hat ein Café mit selbst gebackenem Kuchen. Draußen sitzen, Kaffee dazu: Danach ist man offiziell im Urlaub angekommen.",
    alt: "Ein Stück Käsekuchen mit Gabel, dahinter ein Mann am Tisch",
  },
];

/** Ideen ohne Foto. */
export const more: { title: string; text: string }[] = [
  { title: "Hiddensee", text: "Die autofreie Nachbarinsel. Fähre ab Schaprode, drüben Fahrrad leihen. Ein ganzer Tag lohnt sich." },
  { title: "Rasender Roland", text: "Die Dampf-Schmalspurbahn zuckelt zwischen Putbus und Göhren. Rasend ist daran nichts, schön ist alles." },
  { title: "Störtebeker-Festspiele", text: "Piratentheater unter freiem Himmel in Ralswiek, im Sommer fast jeden Abend. Mit Pferden, Schiffen und Feuerwerk." },
  { title: "Jagdschloss Granitz", text: "Schloss mitten im Wald bei Binz. Oben vom Turm sieht man über halb Rügen, die Wendeltreppe ist ein Erlebnis für sich." },
];
