# Datenschutz-Folgenabschätzung (DSFA) gemäß Art. 35 DSGVO
**Projekt:** SAIFE Gateway – Telemetrie & Pädagogische Steuerungs-Direktiven
**Datum:** 24. Juni 2026
**Status:** Aktiv

*Hinweis: SAIFE Gateway ist eine Middleware; die finale rechtliche Verantwortung (Data Controller) liegt bei der einsetzenden Bildungseinrichtung. Absolute Sicherheit und vollkommene Fehlerfreiheit können in KI-gestützten Systemen nicht garantiert werden; die hier beschriebenen Maßnahmen zielen auf eine bestmögliche Risikominimierung (Best-Effort) ab.*

## 1. Systematische Beschreibung der Verarbeitungsvorgänge
Das SAIFE Gateway integriert zwei Funktionen, die die Verarbeitung personenbezogener Daten (insbesondere von Minderjährigen) umfassen:
*   **Dashboard-Telemetrie & StruggleTracker:** Ein zustandsloser Tracker zählt im flüchtigen Speicher konsekutive Fehlversuche eines Schülers innerhalb einer Session. Bei Überschreiten eines Schwellenwerts (`struggle_threshold`) emittiert das Gateway ein Warnsignal (Empfehlung) an das Lehrer-Dashboard. Zusätzlich werden Session-Daten (wie z. B. Session-ID und Turn-Index) übermittelt, um Lernverläufe besser einordnen zu können.
*   **Pädagogische Steuerungs-Direktiven (Focus Directives):** Lehrkräfte können über das Dashboard spezifische Lernfokus-Anweisungen für einzelne Schüler definieren (z. B. "Bruchrechnung"). Diese werden vom Schul-LMS als Parameter (DslConfig) an das Gateway übermittelt und beeinflussen temporär das Verhalten des KI-Systems.

## 2. Zweck und Rechtsgrundlage
Die Verarbeitung dient der pädagogischen Unterstützung und der zielgerichteten Förderung von Schülern im digitalen Lernumfeld.
Als Rechtsgrundlage für öffentliche Schulen kommt typischerweise Art. 6 Abs. 1 lit. e DSGVO (Wahrnehmung einer Aufgabe im öffentlichen Interesse) in Betracht, in Verbindung mit spezifischen Schulgesetzen der Länder. Für das Tracking und Profiling von Minderjährigen kann, je nach Landesrecht, stattdessen eine explizite Einwilligung (Art. 6 Abs. 1 lit. a, Art. 8 DSGVO) der Erziehungsberechtigten zwingend erforderlich sein.

## 3. Bewertung der Notwendigkeit und Verhältnismäßigkeit
Gemäß dem Grundsatz der Datenminimierung (Art. 5 Abs. 1 lit. c DSGVO) setzt die Architektur folgende Einschränkungen um:
*   **Keine persistente Speicherung im Gateway:** Das SAIFE Gateway speichert weder Steuerungs-Direktiven noch Session-Daten lokal auf der Festplatte (Stateless-Architektur).
*   **Meilenstein-Events statt Per-Turn-Tracking:** Um die Erstellung granularer Verhaltensprofile zu erschweren, emittiert das Gateway standardmäßig nur signifikante pädagogische Meilensteine (z. B. erkanntes Problem, Lernfortschritt). Ein lückenloses Per-Turn-Tracking ist nur als explizites Opt-In vorgesehen und erfordert eine eigenständige Begründung durch den Betreiber.
*   **Zwingendes Ablaufdatum (TTL) für Direktiven:** Steuerungs-Direktiven erhalten ein zwingendes Ablaufdatum (`expiresAt`, maximal 30 Tage), um die ungewollte Anhäufung veralteter pädagogischer Bewertungen abzuweisen.

## 4. Risikobewertung (Rechte und Freiheiten der Betroffenen)
Da es sich um schutzbedürftige Personen (Kinder) handelt, ist das Risiko bei unzureichenden Schutzmaßnahmen grundsätzlich als hoch einzustufen:
*   **Risiko 1: Verhaltensprofilierung und automatisierte Entscheidungsfindung (Art. 22 DSGVO).** Eine automatische, ungeprüfte Anpassung der KI an einen vom System erkannten "Struggle" könnte als algorithmische Fehlbewertung wirken und den Lernweg des Kindes negativ beeinflussen.
*   **Risiko 2: Prompt-Injection via Steuerungs-Direktiven.** Manipulierte oder unzureichend geprüfte Eingaben (z.B. XML-Tags in Freitexten) könnten die KI-Sicherheitsregeln umgehen und das Kind unerwünschten Inhalten aussetzen.
*   **Risiko 3: Re-Identifizierung durch Session-Fingerprinting.** Die Kombination aus Session-ID, Dauer und spezifischen Lernthemen könnte es Dritten (z. B. im Forschungs-Stream) ermöglichen, eigentlich anonymisierte Daten durch Korrelationsangriffe wieder einem Schüler zuzuordnen.
*   **Risiko 4: Verarbeitung sensibler Daten.** Freitextfelder in pädagogischen Anweisungen bergen das Risiko, dass versehentlich Gesundheitsdaten (z. B. "Legasthenie") verarbeitet werden, was den strengen Schutzanforderungen des Art. 9 DSGVO unterliegt.

## 5. Geplante Maßnahmen zur Risikominderung
Um die beschriebenen Risiken auf ein rechtlich und ethisch vertretbares Maß zu reduzieren, implementiert das Gateway folgende technische und organisatorische Maßnahmen (TOMs):

*   **Zu Risiko 1 (Advisory-Only & Human-in-the-Loop):** Der `StruggleTracker` trifft *keine* autonomen Entscheidungen. Er emittiert lediglich eine Empfehlung an das Dashboard (`is_formative_only: true`). Die Lehrkraft muss diese prüfen und proaktiv bestätigen, bevor die KI ihren pädagogischen Kurs ändert.
*   **Zu Risiko 2 & 4 (Strict Sanitization Regex):** Um dem Bildungsföderalismus gerecht zu werden, erlaubt das Gateway dynamische Themenbezeichnungen vom LMS. Jedoch erzwingt es zur Laufzeit ein striktes Zod-Validierungsschema (Regex): Es sind ausschließlich alphanumerische Zeichen und Leerzeichen erlaubt. Jegliche Sonderzeichen, XML-Tags oder typische Injection-Muster werden technisch blockiert, was eine Kompromittierung des System-Prompts ausschließt. Die Betreiber werden verpflichtet, keine Art. 9-Daten (Gesundheitsdaten) als Themenbezeichnung zu übermitteln.
*   **Zu Risiko 3 (Strict Stripping im Forschungs-Stream):** Die Architektur erzwingt einen dedizierten, reduzierten Datentyp (`Stream2SafeContext`). Metadaten wie `sessionId`, `turnIndex` oder die spezifischen Themen werden beim Export in den Forschungs-Stream auf Code-Ebene verworfen, um Re-Identifizierung so weit wie möglich auszuschließen.
*   **Einschränkung der Modell-Garantien:** Es muss durch den Betreiber im UI transparent gemacht werden, dass das Signal "Lernfortschritt" maßgeblich durch das LLM evaluiert wird. LLMs sind anfällig für Halluzinationen oder "Sycophancy" (dem Nutzer nach dem Mund reden). Das Signal stellt lediglich eine Heuristik dar und kann eine fundierte Leistungsbewertung durch qualifiziertes Lehrpersonal niemals ersetzen.
