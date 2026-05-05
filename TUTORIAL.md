# LuaScratch Tutorial

Ten poradnik prowadzi od pustego projektu do gotowego projektu `.sb3` w LuaScratch IDE.

## 1. Jak myslec o LuaScratch

LuaScratch nie jest edytorem bloczkowym. To IDE tekstowe inspirowane Scratch i VS Code.

Projekt sklada sie logicznie z plikow:

- `stage/Stage.moon`
- `sprites/*.moon`
- `drafts/*.moon`

Kazdy duszek ma wlasny plik `MoonLua`. Scena tez ma wlasny plik. Tla i dzwieki sa trzymane jako assety projektu.

## 2. Jak otworzyc IDE

1. Otworz [index.html](/C:/Users/Tobiasz/Projekty/LuaScratch/index.html) w przegladarce.
2. Po lewej zobaczysz `Explorer`.
3. W sekcji `Files` wybierasz plik, ktory chcesz edytowac.
4. Na srodku masz glowny edytor kodu.

## 3. Pierwszy projekt

Najprostszy projekt sklada sie z:

- logiki sceny w `stage/Stage.moon`
- logiki duszka w `sprites/Kot.moon`
- opcjonalnych szkicow i globali w `drafts/*.moon`

### `drafts/globals.moon`

```lua
global score = 0
global speed = 8
```

To miejsce na:

- zmienne globalne
- stale projektu
- wspolne komentarze

## 4. Pierwszy duszek

Przyklad pliku `sprites/Kot.moon`:

```lua
sprite "Kot" do
  when flag_clicked do
    goto(0, 0)
    show()
    say("Start!", 1)
  end
end
```

To oznacza:

- `sprite "Kot" do` otwiera definicje duszka
- `when flag_clicked do` uruchamia skrypt po starcie projektu
- `goto(0, 0)` ustawia pozycje
- `show()` pokazuje duszka
- `say("Start!", 1)` wyswietla dymek na 1 sekunde

## 5. Zdarzenia

W `MoonLua` skrypty najczesciej zaczynaja sie od zdarzen.

### Start projektu

```lua
when flag_clicked do
  say("Hello", 1)
end
```

### Klikniecie duszka

```lua
when clicked do
  say("Kliknieto mnie", 1)
end
```

### Nacisniecie klawisza

```lua
when key("space") do
  say("Spacja", 1)
end
```

### Otrzymanie broadcastu

```lua
when broadcast("start") do
  say("Dostalem sygnal", 1)
end
```

### Zmiana tla

```lua
when backdrop("Noc") do
  say("Zrobilo sie ciemno", 1)
end
```

## 6. Ruch duszka

### Prosty ruch

```lua
sprite "Kot" do
  when key("arrowright") do
    move(10)
  end

  when key("arrowleft") do
    move(-10)
  end
end
```

### Ustawienie pozycji

```lua
goto(100, 40)
set_x(120)
set_y(-30)
change_x(15)
change_y(-15)
```

### Obrot

```lua
point_in_direction(90)
turn_right(15)
turn_left(15)
point_towards("Orbita")
```

### Plynny ruch

```lua
glide(1, 120, 40)
```

To przesunie duszka do punktu `(120, 40)` w `1` sekunde.

### Odbicie od krawedzi

```lua
if touching_edge() then
  bounce()
end
```

## 7. Wyglad i tlo

### Pokazywanie i ukrywanie

```lua
show()
hide()
```

### Dymki

```lua
say("Czesc", 2)
think("Hmm...", 1.5)
```

### Kostiumy

```lua
next_costume()
switch_costume("Kot Glow")
```

### Rozmiar

```lua
set_size(120)
change_size(10)
```

### Tla

Plik sceny moze wygladac tak:

```lua
stage "Stage" do
  when broadcast("night") do
    switch_backdrop("Noc")
  end

  when broadcast("day") do
    switch_backdrop("Dzien")
  end
end
```

Mozesz tez uzyc:

```lua
next_backdrop()
switch_backdrop("Dzien")
```

## 8. Zmienne

### Zmienne globalne

W `drafts/globals.moon`:

```lua
global score = 0
global lives = 3
```

W plikach duszkow:

```lua
set score = 10
change score by 1
say("Score: " .. score, 1)
```

### Zmienne lokalne

Jesli zmienna nie istnieje globalnie, LuaScratch traktuje ja jak lokalna dla duszka podczas runtime.

Przyklad:

```lua
set localCounter = 0
change localCounter by 1
```

## 9. Sterowanie

### `repeat`

```lua
repeat(10) do
  move(10)
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
if touching_sprite("Orbita") then
  say("Trafienie!", 1)
end
```

### `while`

```lua
while score < 10 do
  change score by 1
end
```

## 10. Broadcasty

Broadcasty dzialaja jak wiadomosci miedzy skryptami.

### Wysylanie

```lua
broadcast("night")
```

### Odbieranie

```lua
when broadcast("night") do
  switch_backdrop("Noc")
end
```

To wygodny sposob na:

- zmiane stanu gry
- start poziomu
- porozumiewanie sie sceny i duszkow

## 11. Wykrywanie kolizji i wejscia

### Krawedz

```lua
if touching_edge() then
  bounce()
end
```

### Inny duszek

```lua
if touching_sprite("Przeciwnik") then
  say("Kolizja", 1)
end
```

### Klawisz

Mozesz sprawdzac klawisze w warunku:

```lua
if key_pressed("arrowright") then
  move(5)
end
```

To przydaje sie wewnatrz `forever do`.

## 12. Przykladowa mini-gra

### `drafts/globals.moon`

```lua
global score = 0
global speed = 6
```

### `stage/Stage.moon`

```lua
stage "Stage" do
  when broadcast("win") do
    switch_backdrop("Noc")
  end
end
```

### `sprites/Kot.moon`

```lua
sprite "Kot" do
  when flag_clicked do
    goto(-120, 0)
    set score = 0
    show()
  end

  forever do
    if key_pressed("arrowright") then
      move(speed)
    end
    if key_pressed("arrowleft") then
      move(-speed)
    end
    if touching_sprite("Orbita") then
      change score by 1
      say("Score: " .. score, 0.3)
      if score > 4 then
        broadcast("win")
      end
    end
    wait(0.02)
  end
end
```

### `sprites/Orbita.moon`

```lua
sprite "Orbita" do
  when flag_clicked do
    goto(100, 50)
  end

  when clicked do
    next_costume()
    say("Klik!", 0.5)
  end
end
```

## 13. Jak dodawac duszki i tla

### Nowy duszek

1. Kliknij `+` w sekcji `Files`.
2. Nadaj nazwe.
3. IDE utworzy nowy plik `sprites/Nazwa.moon`.

### Nowe tlo

1. Kliknij `BG` w sekcji `Files`.
2. Nadaj nazwe tla.
3. Tlo zostanie dodane do assetow sceny.

## 14. Import `.sb3`

LuaScratch potrafi czytac `.sb3`.

Po imporcie:

- duszki staja sie targetami projektu
- tlo sceny staje sie assetem sceny
- kostiumy i dzwieki sa importowane
- bloki Scratch sa tlumaczone na `MoonLua`

Wazne:

- nie wszystkie bloki Scratch sa mapowane 1:1
- mniej typowe bloki moga zostac zapisane jako placeholdery typu `scratch_opcode()`

## 15. Eksport `.sb3`

Po kliknieciu `Eksport .sb3` LuaScratch:

1. kompiluje `MoonLua`
2. buduje `project.json`
3. pakuje assety do ZIP
4. zapisuje plik `.sb3`

To oznacza, ze projekt mozna dalej otwierac w ekosystemie Scratch, o ile uzyte konstrukcje maja mapowanie do blokow Scratch.

## 16. Dobre praktyki

### Trzymaj globale w `drafts/globals.moon`

```lua
global score = 0
global speed = 5
global level = 1
```

### Jedna odpowiedzialnosc na plik

- scena: tlo, broadcasty poziomu
- duszek gracza: sterowanie
- przeciwnik: AI
- UI duszek: komunikaty

### Uzywaj broadcastow zamiast sztywnego sprzezenia

Lepsze:

```lua
broadcast("game_over")
```

Gorsze:

- wpisywanie tej samej logiki recznie w kilku plikach

### Uzywaj `wait()` w petlach `forever`

Lepsze:

```lua
forever do
  move(1)
  wait(0.02)
end
```

Gorsze:

```lua
forever do
  move(1)
end
```

Bez `wait()` petla moze byc zbyt agresywna.

## 17. Typowe bledy

### Brak `end`

Zle:

```lua
sprite "Kot" do
  when flag_clicked do
    move(10)
```

Dobrze:

```lua
sprite "Kot" do
  when flag_clicked do
    move(10)
  end
end
```

### Zdarzenie poza duszkiem albo scena

Zdarzenie musi byc wewnatrz:

- `sprite "..." do`
- `stage "..." do`

### Literowka w nazwie duszka lub tla

Jesli masz:

```lua
touching_sprite("Orbita")
```

to duszek musi naprawde nazywac sie `Orbita`.

## 18. Co dalej

Po tym tutorialu przejdz do:

- [MOONLUA_REFERENCE.md](/C:/Users/Tobiasz/Projekty/LuaScratch/MOONLUA_REFERENCE.md)
- [README.md](/C:/Users/Tobiasz/Projekty/LuaScratch/README.md)
