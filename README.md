# LuaScratch IDE

Statyczna aplikacja webowa gotowa do wrzucenia na GitHub Pages. Projekt udostepnia kodowe IDE w stylu plikowym, wlasny jezyk `MoonLua`, import i eksport `.sb3` oraz logiczny podzial projektu na osobne pliki dla sceny, duszkow i tel.

## Co dziala

- edytor kodu w stylu IDE z numerami linii i eksploratorem plikow
- pliki logiczne:
  - `stage/Stage.moon`
  - `sprites/*.moon`
  - `drafts/*.moon`
  - widoki metadanych `*.json` dla duszkow, tel i dzwiekow
- parser `MoonLua` z obsluga:
  - `sprite "Nazwa" do ... end`
  - `stage "Stage" do ... end`
  - zdarzen `when flag_clicked`, `when key("...")`, `when clicked`, `when backdrop("...")`, `when broadcast("...")`
  - sterowania `repeat`, `forever`, `if`, `while`
  - danych `global`, `set`, `change ... by ...`
  - ruchu i wygladu: `move`, `goto`, `glide`, `turn_right`, `turn_left`, `change_x`, `change_y`, `set_x`, `set_y`, `show`, `hide`, `say`, `think`, `switch_backdrop`, `next_backdrop`, `switch_costume`, `next_costume`, `set_size`, `change_size`, `bounce`
  - dzwieku: `play_sound("Nazwa")`
- eksport projektu do wlasnego formatu `.sb`
- import wlasnego `.sb`
- import `.sb3` ze Scratch wraz z:
  - duszkami i tlami
  - kostiumami i dzwiekami
  - tlumaczeniem skryptow Scratch do `MoonLua`
- eksport `.sb3` z generowaniem `project.json` i assetow ZIP

## Uruchomienie lokalne

Wystarczy otworzyc [index.html](/C:/Users/Tobiasz/Projekty/LuaScratch/index.html) w przegladarce.

Jesli chcesz odpalic prosty serwer lokalny:

```powershell
python -m http.server 8080
```

Potem wejdz na `http://localhost:8080`.

## Deploy na GitHub Pages

1. Utworz repozytorium na GitHub.
2. Wrzuc zawartosc tego katalogu do brancha `main`.
3. W ustawieniach repozytorium wejdz w `Pages`.
4. Ustaw deployment z `Deploy from a branch`.
5. Wybierz branch `main` i folder `/ (root)`.

Po chwili aplikacja bedzie dostepna pod adresem GitHub Pages repozytorium.

## Uwagi

- Format `.sb` w tym projekcie jest wlasnym formatem JSON dla LuaScratch.
- `.sb3` jest zapisywane jako archiwum ZIP z `project.json` i assetami.
- Import i eksport skryptow Scratch dziala dla najwazniejszych blokow zdarzen, ruchu, wygladu, sterowania, zmiennych i czesci reporterow. Niektore rzadsze bloki sa zamieniane na placeholdery `scratch_*(...)` albo komentarze do dalszej obrobki.

## Dokumentacja

- Tutorial krok po kroku: [TUTORIAL.md](/C:/Users/Tobiasz/Projekty/LuaScratch/TUTORIAL.md)
- Referencja jezyka: [MOONLUA_REFERENCE.md](/C:/Users/Tobiasz/Projekty/LuaScratch/MOONLUA_REFERENCE.md)
