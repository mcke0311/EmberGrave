# Monster families

Campaign encounters now draw from curated regional families. The generated
bestiary remains available to the editor, but enemies no longer enter every
nearby level's spawn pool. Existing creature art, damage types and abilities
are retained.

Examples:

| Family | Territory | Routine |
| --- | --- | --- |
| Rimebound Watch | Northern watch-posts, burial grounds, temple halls | Patrol with archers and guardians |
| Shardbound | Mines, quarries, crystal shrines | Gather around ritual sites |
| Icefang Pack | Caravan remains, icy narrows, spring approaches | Prowl around a den |
| Glacial Brood | Ice galleries and shelves | Move around a nest |
| Silent Choir | Marsh bells, monastery courts | Hold ritual ground |
| Mire Brood | Nursery pools and cisterns | Larvae and bloated adults occupy nesting grounds |
| Gilded Host | Imperial tombs and palace approaches | Sentinels screen chained souls |
| Ash Legion | Siege lines, battlements, causeways | Fiends, armored soldiers and casters patrol together |
| Ashen Dead | Fallen kings and infernal monuments | Haunt burial ground |

Each authored landmark has a stable habitat. Packs contain only members of
their family; different packs can share a larger family territory. Marsh
individual quotas remain exact, with at most two ranged enemies and one
specialist per pack. Quest-owned bosses, reinforcements, ritual priests and
cache guardians keep their encounter rules.

Patrols move together on a shared rhythm. Prowlers, nesting creatures and
ritual attendants have different travel distances and pauses. Idle movement
stays near each monster's home and uses existing terrain collision. This
does not limit combat pursuit or restore health when a monster moves home.

Sight and damage alert nearby members of the same pack through line of sight.
Alerts do not relay between packs or wake unrelated species. Summons inherit
their owner's family. Infernal faction rivalries remain active, and idle
demons can notice a rival before noticing the player.

Family names appear on enemy hover plates. Camps, dens, nests, burial sites
and ritual props reuse the installed act-specific art. They are nonblocking,
avoid arrivals and passages, and become deserted when their territory's last
resident dies. They add no extra loot or respawning monsters.

Reload an existing save to regenerate its regions with the new populations.
No save conversion is required.

Validation:

- `node tests/monster_families_contract.mjs`: 96 generated maps, repeatable
  populations, body support, family membership, marsh quotas, alert isolation,
  summons, 90-second idle movement, habitat art and territory clearing.
- `node tests/monster_families_browser.cjs`: six isolated Chrome scenes with
  actual game rendering and 12 seconds of family movement. Requires Playwright
  and the local server on port 8741. Captures are in `tests/qa/monster_families`.
- Existing opening, campaign, Act I terrain, boss, Act II, cathedral and
  Cinderdeep combat contracts verify integration.
