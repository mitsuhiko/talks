// Generates the incident bundle the user "uploads": a payment gateway vendor's log export for the night of the incident.
//
// Four gateway nodes log every card authorization as one JSON line. At 02:09:58 gw-3 rotated its client certificate
// for the acquirer "nordbank" to one issued by a CA nordbank does not trust yet; until the manual rollback at 03:41,
// every nordbank authorization routed through gw-3 failed the TLS handshake. A latency bump on gw-1 around 04:20 is a
// red herring. Deterministic: the same bundle every time.
//
//   node scenario/generate.ts [out.tar.gz]
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export const BUNDLE_NAME = "gateway-logs-2026-10-12.tar.gz";

const LINES_PER_NODE = 90_000;
const NODES = ["gw-1", "gw-2", "gw-3", "gw-4"];
const DAY = Date.parse("2026-10-12T00:00:00Z");
const SPAN_MS = 6 * 3600_000; // 00:00 to 06:00
const INCIDENT_START = Date.parse("2026-10-12T02:09:58Z");
const INCIDENT_END = Date.parse("2026-10-12T03:41:12Z");
const LATENCY_BUMP = [Date.parse("2026-10-12T04:18:00Z"), Date.parse("2026-10-12T04:33:00Z")];

const MERCHANT_NAMES = [
	"Kaffeehaus Lindner", "Radwerk Ottakring", "Brot & Salz", "Kino am Spittelberg", "Apotheke zur Mondsichel",
	"Weinbar Krugerstrasse", "Elektro Pichler", "Gasthaus Sonne", "Blumen Hofer", "Buchladen Am Eck",
	"Konditorei Zauner-Haas", "Schuhhaus Brandl", "Optik Wenzel", "Fahrradkurier Wien", "Naschmarkt Gewuerze",
	"Hotel Drei Linden", "Tierarzt Dr. Moser", "Pizzeria Vesuvio 7", "Copyshop Mariahilf", "Baeckerei Ruhm",
	"Sportbox Favoriten", "Galerie Westlicht Nord", "Eisgreissler Leopold", "Taxi Union 31", "Musikhaus Doblinger-Lenz",
	"Wirtshaus zum Hirschen", "Spielwaren Kober", "Tabak Trafik 1070", "Yoga Loft Neubau", "Reinigung Express",
];

/** Mulberry32: a tiny seeded PRNG, so the bundle is identical on every run. */
function prng(seed: number) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function generateBundle(outFile: string): void {
	const random = prng(20261012);
	const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)]!;
	const acquirers = ["nordbank", "alpenpay", "eurocard"];
	const merchants = MERCHANT_NAMES.map((name, index) => ({
		id: `m_${1001 + index}`,
		name,
		// Each merchant settles with one acquirer; roughly a third use nordbank.
		acquirer: acquirers[index % 3]!,
		ticket: 800 + Math.floor(random() * 9000),
	}));

	const dir = mkdtempSync(join(tmpdir(), "incident-"));
	const logs = join(dir, "logs");
	mkdirSync(logs);
	for (const node of NODES) {
		const times = Array.from({ length: LINES_PER_NODE }, () => DAY + Math.floor(random() * SPAN_MS)).sort((a, b) => a - b);
		const lines: string[] = [];
		for (const ts of times) {
			const merchant = pick(merchants);
			let status = "approved";
			let code = "00";
			let latency = 90 + Math.floor(random() * 160);
			const roll = random();
			if (node === "gw-3" && merchant.acquirer === "nordbank" && ts >= INCIDENT_START && ts < INCIDENT_END) {
				status = "error";
				code = "E_TLS_HANDSHAKE";
				latency = 25 + Math.floor(random() * 20);
			} else if (roll < 0.022) {
				status = "declined";
				code = pick(["05_do_not_honor", "51_insufficient_funds", "54_expired_card"]);
			} else if (roll < 0.0235) {
				status = "error";
				code = "E_UPSTREAM_TIMEOUT";
				latency = 10_000;
			}
			if (node === "gw-1" && ts >= LATENCY_BUMP[0]! && ts < LATENCY_BUMP[1]!) latency += 900 + Math.floor(random() * 700);
			const amount = Math.max(100, Math.round(merchant.ticket * (0.4 + random() * 1.4)));
			lines.push(
				JSON.stringify({
					ts: new Date(ts).toISOString(),
					node,
					txn: `t_${Math.floor(random() * 2 ** 48).toString(16).padStart(12, "0")}`,
					merchant: merchant.id,
					merchant_name: merchant.name,
					acquirer: merchant.acquirer,
					amount_cents: amount,
					currency: "EUR",
					status,
					code,
					latency_ms: latency,
					...(code === "E_TLS_HANDSHAKE"
						? { error: "tls: remote error: bad certificate (peer did not accept client certificate chain)" }
						: {}),
				}),
			);
		}
		writeFileSync(join(logs, `${node}.jsonl`), `${lines.join("\n")}\n`);
	}

	writeFileSync(
		join(logs, "deploy.log"),
		[
			"2026-10-12T00:30:11Z gw-2 config-sync: ok (rev 4471)",
			"2026-10-12T01:55:02Z gw-1 config-sync: ok (rev 4471)",
			"2026-10-12T02:09:41Z gw-3 cert-manager: renewing client certificate for acquirer=nordbank (expires 2026-10-19)",
			'2026-10-12T02:09:58Z gw-3 cert-manager: installed client certificate for acquirer=nordbank serial=4F:A1:07:3C:9C issuer="Payments Issuing CA G2"',
			"2026-10-12T02:10:00Z gw-3 tls-pool: reloaded 3 upstream pools",
			"2026-10-12T02:40:17Z gw-4 config-sync: ok (rev 4472)",
			"2026-10-12T03:38:55Z gw-3 operator(oncall-mira): cert-manager pin acquirer=nordbank serial=2B:77:E0:11:04",
			'2026-10-12T03:41:12Z gw-3 cert-manager: installed client certificate for acquirer=nordbank serial=2B:77:E0:11:04 issuer="Payments Issuing CA G1"',
			"2026-10-12T03:41:13Z gw-3 tls-pool: reloaded 3 upstream pools",
			"2026-10-12T04:18:30Z gw-1 gc: long pause 1.2s (heap 3.1G)",
			"",
		].join("\n"),
	);
	writeFileSync(
		join(dir, "README.txt"),
		[
			"Gateway log export for incident INC-2291",
			"Window: 2026-10-12 00:00Z to 06:00Z, nodes gw-1..gw-4",
			"logs/<node>.jsonl  one JSON object per card authorization attempt",
			"logs/deploy.log    configuration and certificate changes",
			"Generated 2026-10-12T07:12Z by the vendor's export tool. Contains merchant data; handle accordingly.",
			"",
		].join("\n"),
	);
	// Look like the vendor's export, not like something made on this laptop.
	const exported = new Date("2026-10-12T07:12:00Z");
	for (const name of readdirSync(logs)) utimesSync(join(logs, name), exported, exported);
	for (const path of [logs, join(dir, "README.txt")]) utimesSync(path, exported, exported);
	const owner = ["--uid", "1000", "--gid", "1000", "--uname", "export", "--gname", "export"];
	execFileSync("tar", ["czf", resolve(outFile), ...owner, "-C", dir, "README.txt", "logs"], {
		env: { ...process.env, COPYFILE_DISABLE: "1" },
	});
	rmSync(dir, { recursive: true, force: true });
}

if (import.meta.main) generateBundle(process.argv[2] ?? BUNDLE_NAME);
