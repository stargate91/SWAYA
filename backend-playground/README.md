# Backend Playground

Ez egy teszt/kísérleti projekt a Swaya backend **Moduláris Monolit (Vertical Slice Architecture)** alapú újraírásának kipróbálására.

## Felépítés

```
backend-playground/
├── app/
│   ├── core/           # Globális adatbázis, konfiguráció, logolás
│   ├── modules/        # Funkció alapú modulok (Vertical Slices)
│   │   ├── health/     # Minta modul
│   │   └── users/      # Készülő modulok...
│   └── main.py         # FastAPI alkalmazás belépési pont
└── README.md
```

## Indítás

```bash
uvicorn app.main:app --reload
```
