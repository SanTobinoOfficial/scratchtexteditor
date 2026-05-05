# MoonLua Reference

Techniczna dokumentacja jezyka `MoonLua` dla LuaScratch IDE.

## 1. Cel jezyka

`MoonLua` to uproszczony jezyk tekstowy inspirowany Lua, zaprojektowany do:

- opisu projektow Scratch-like w plikach
- mapowania na strukture `.sb3`
- pracy z duszkami, scena, tlami i zdarzeniami

`MoonLua` nie jest pelnym Lua.

## 2. Struktura projektu

Typowy projekt:

- `stage/Stage.moon`
- `sprites/Gracz.moon`
- `sprites/Przeciwnik.moon`
- `drafts/globals.moon`

## 3. Struktura top-level

Dozwolone konstrukcje top-level:

- `global NAME = EXPR`
- `sprite "NAME" do ... end`
- `stage "NAME" do ... end`

### Przyklad

```lua
global score = 0

stage "Stage" do
  when broadcast("night") do
    switch_backdrop("Noc")
  end
end

sprite "Kot" do
  when flag_clicked do
    goto(0, 0)
  end
end
```

## 4. Definicja targetu

### Duszek

```lua
sprite "Kot" do
  ...
end
```

### Scena

```lua
stage "Stage" do
  ...
end
```

## 5. Zdarzenia

Zdarzenia otwieraja skrypty.

### `when flag_clicked do`

Start po uruchomieniu projektu.

```lua
when flag_clicked do
  say("Start", 1)
end
```

### `when clicked do`

Klikniecie duszka.

```lua
when clicked do
  next_costume()
end
```

### `when key("KEY") do`

Zdarzenie klawisza.

```lua
when key("space") do
  say("Spacja", 1)
end
```

### `when broadcast("NAME") do`

Reakcja na broadcast.

```lua
when broadcast("game_over") do
  hide()
end
```

### `when backdrop("NAME") do`

Reakcja na konkretne tlo sceny.

```lua
when backdrop("Noc") do
  say("Noc", 1)
end
```

## 6. Instrukcje

### `set`

```lua
set score = 10
```

### `change`

```lua
change score by 1
```

### `repeat`

```lua
repeat(10) do
  move(5)
end
```

### `forever`

```lua
forever do
  turn_right(5)
  wait(0.03)
end
```

### `if`

```lua
if touching_edge() then
  bounce()
end
```

### `while`

```lua
while score < 10 do
  change score by 1
end
```

## 7. Komendy

Poniezej referencja najwazniejszych komend.

### Ruch

#### `move(STEPS)`

Przesuwa duszka o liczbe krokow zgodnie z kierunkiem.

```lua
move(10)
```

#### `goto(X, Y)`

Ustawia pozycje duszka.

```lua
goto(0, 0)
```

#### `glide(SECS, X, Y)`

Plynne przejscie do punktu.

```lua
glide(1, 100, 40)
```

#### `change_x(VALUE)`

```lua
change_x(10)
```

#### `change_y(VALUE)`

```lua
change_y(-10)
```

#### `set_x(VALUE)`

```lua
set_x(120)
```

#### `set_y(VALUE)`

```lua
set_y(-40)
```

#### `turn_right(DEGREES)`

```lua
turn_right(15)
```

#### `turn_left(DEGREES)`

```lua
turn_left(15)
```

#### `point_in_direction(DEGREES)`

```lua
point_in_direction(90)
```

#### `point_towards(TARGET)`

`TARGET` to najczesciej nazwa duszka albo `"mouse-pointer"`.

```lua
point_towards("Orbita")
```

#### `bounce()`

Odbicie od krawedzi.

```lua
bounce()
```

### Wyglad

#### `show()`

```lua
show()
```

#### `hide()`

```lua
hide()
```

#### `say(TEXT, SECS)`

```lua
say("Czesc", 2)
```

#### `think(TEXT, SECS)`

```lua
think("Hmm", 1)
```

#### `next_costume()`

```lua
next_costume()
```

#### `switch_costume(NAME)`

```lua
switch_costume("Kot Glow")
```

#### `set_size(VALUE)`

```lua
set_size(120)
```

#### `change_size(VALUE)`

```lua
change_size(10)
```

### Tla

#### `switch_backdrop(NAME)`

```lua
switch_backdrop("Noc")
```

#### `next_backdrop()`

```lua
next_backdrop()
```

### Czas

#### `wait(SECS)`

```lua
wait(0.2)
```

### Komunikacja

#### `broadcast(NAME)`

```lua
broadcast("start")
```

### Debug i logi

#### `log(...)`

```lua
log("debug")
```

### Dzwiek

#### `play_sound(NAME_OR_VALUE)`

Najbezpieczniej uzywac nazwy dzwieku:

```lua
play_sound("Pop")
```

## 8. Wyrazenia

`MoonLua` wspiera podstawowe wyrazenia numeryczne, tekstowe i logiczne.

### Liczby

```lua
10
3.14
-2
```

### Napisy

```lua
"Hello"
```

### Konkatenacja tekstu

```lua
"Score: " .. score
```

### Operatory arytmetyczne

```lua
score + 1
score - 1
score * 2
score / 2
```

### Operatory porownania

```lua
score == 10
score > 3
score < 20
score >= 5
score <= 9
```

### Operatory logiczne

```lua
a and b
a or b
not a
```

## 9. Funkcje reporterskie

Te funkcje mozna stosowac w wyrazeniach.

### `touching_edge()`

```lua
if touching_edge() then
  bounce()
end
```

### `touching_sprite("NAME")`

```lua
if touching_sprite("Orbita") then
  say("Hit", 1)
end
```

### `key_pressed("KEY")`

```lua
if key_pressed("arrowright") then
  move(5)
end
```

### `mouse_x()`

```lua
set targetX = mouse_x()
```

### `mouse_y()`

```lua
set targetY = mouse_y()
```

### `backdrop_name()`

```lua
say(backdrop_name(), 1)
```

### `sprite_x()`

```lua
set px = sprite_x()
```

### `sprite_y()`

```lua
set py = sprite_y()
```

### `random(MIN, MAX)`

```lua
set roll = random(1, 6)
```

### Funkcje matematyczne

Wspierane:

- `abs(x)`
- `floor(x)`
- `ceil(x)`
- `round(x)`
- `sqrt(x)`
- `sin(x)`
- `cos(x)`

Przyklad:

```lua
set v = abs(-4)
```

## 10. Globalne vs lokalne

### Globalne

Definiowane przez:

```lua
global score = 0
```

Sa wspoldzielone przez targety.

### Lokalne

Jesli zmienna nie istnieje globalnie, moze zostac uzyta jako zmienna lokalna targetu podczas runtime.

```lua
set patrolStep = 1
```

## 11. Reguly skladni

### Komentarze

Komentarze zaczynaja sie od `--`

```lua
-- To jest komentarz
```

### Bloki

Bloki wymagaja `end`.

Dotyczy to:

- `sprite ... do`
- `stage ... do`
- `when ... do`
- `repeat(...) do`
- `forever do`
- `while ... do`
- `if ... then`

### Wciecia

Wciecia nie sa obowiazkowe dla parsera, ale sa mocno zalecane.

## 12. Mapowanie na Scratch

LuaScratch kompiluje czesc konstrukcji do `.sb3`.

### Przyklady mapowania

- `when flag_clicked do` -> `event_whenflagclicked`
- `move(10)` -> `motion_movesteps`
- `goto(x, y)` -> `motion_gotoxy`
- `wait(1)` -> `control_wait`
- `broadcast("start")` -> `event_broadcast`
- `set score = 1` -> `data_setvariableto`

## 13. Import ze Scratch

Podczas importu `.sb3` LuaScratch:

1. czyta `project.json`
2. odczytuje targety, kostiumy, dzwieki i zmienne
3. buduje pliki `MoonLua`
4. probuje przetlumaczyc skrypty Scratch na tekst

Jesli blok nie ma jeszcze mapowania, moze zostac zapisany jako:

```lua
log("[Scratch:opcode]")
```

albo:

```lua
scratch_opcode()
```

## 14. Ograniczenia aktualnej implementacji

Aktualna wersja nie jest jeszcze pelna implementacja wszystkich mozliwosci Scratch.

Najwazniejsze ograniczenia:

- nie wszystkie opcodes Scratch sa mapowane
- czesc reporterow i menu blokow ma uproszczone tlumaczenie
- brak pelnego systemu custom blocks
- brak list i monitorow jako pelnoprawnych elementow UI
- brak gwarancji idealnego round-trip dla bardzo zlozonych `.sb3`

## 15. Minimalny kompletny przyklad

### `drafts/globals.moon`

```lua
global score = 0
```

### `stage/Stage.moon`

```lua
stage "Stage" do
  when broadcast("night") do
    switch_backdrop("Noc")
  end
end
```

### `sprites/Kot.moon`

```lua
sprite "Kot" do
  when flag_clicked do
    goto(0, 0)
    show()
  end

  when key("space") do
    change score by 1
    say("Score: " .. score, 1)
    broadcast("night")
  end
end
```

## 16. Pliki powiazane

- [TUTORIAL.md](/C:/Users/Tobiasz/Projekty/LuaScratch/TUTORIAL.md)
- [README.md](/C:/Users/Tobiasz/Projekty/LuaScratch/README.md)
