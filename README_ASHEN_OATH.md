# ASHEN OATH

## Cahier de route et guide de développement

> **Genre :** Soulslike / Action-RPG 2D\
> **Perspective :** Side-scrolling (vue latérale)\
> **Plateforme cible :** Navigateur Web\
> **Technologies prévues :** Phaser 3, TypeScript, Vite, Node.js,
> Express, PostgreSQL et Docker Compose\
> **Statut :** Projet à initialiser --- les fonctionnalités décrites
> ci-dessous sont des objectifs, pas des fonctionnalités déjà
> implémentées.

------------------------------------------------------------------------

## 1. Présentation du projet

**ASHEN OATH --- Le Serment des Cendres** est un jeu d'action-RPG 2D de
dark fantasy inspiré des Soulslike. Le joueur explore un royaume déchu,
affronte des ennemis exigeants, apprend leurs patterns, récupère les
ressources perdues à sa mort et découvre des raccourcis ainsi que des
secrets.

### Principes de conception

-   Des combats exigeants mais justes : chaque attaque ennemie doit être
    lisible et esquivable.
-   Des commandes réactives et cohérentes.
-   Une exploration récompensant la curiosité.
-   Des boss avec des patterns distincts et plusieurs phases lorsque
    cela sert le combat.
-   Une progression compréhensible, sans rendre le joueur inutilement
    puissant.
-   Une direction artistique cohérente : pixel art HD, décors gothiques,
    éclairage sobre et palette sombre.
-   Une version Web accessible sans installation du jeu.

### Univers et histoire

Le royaume de Vareth a été ravagé par une catastrophe appelée **le Grand
Silence**. Les morts ne trouvent plus le repos et les anciens chevaliers
gardent des territoires abandonnés.

Le joueur incarne un chevalier sans nom, réveillé dans une crypte avec
une épée brisée. Il doit retrouver les fragments du Serment, vaincre les
gardiens et découvrir pourquoi le royaume refuse de mourir.

------------------------------------------------------------------------

## 2. Périmètre du jeu

### Première démo jouable (MVP)

La première version doit rester volontairement limitée :

1.  Un menu principal.
2.  Un personnage contrôlable.
3.  Un niveau de test avec plateformes et collisions.
4.  Un ennemi de base avec une IA simple.
5.  Un système de vie et d'endurance.
6.  Une attaque légère, une esquive et une parade.
7.  Un sanctuaire servant de point de réapparition.
8.  Un premier boss avec au moins deux comportements ou phases.
9.  Une interface de jeu minimale.
10. Une sauvegarde locale de la démo.

**Critère de réussite :** un joueur doit pouvoir démarrer une partie,
traverser le niveau, combattre, mourir, réapparaître et vaincre le boss
sans blocage.

### Version étendue

Après validation du MVP :

-   Cinq régions interconnectées.
-   Cinq boss principaux.
-   Plusieurs familles d'ennemis.
-   Armes, armures, anneaux et reliques.
-   Statistiques et amélioration du personnage.
-   PNJ, dialogues et quêtes.
-   Secrets, raccourcis et portes verrouillées.
-   Comptes et sauvegardes côté serveur.
-   Commandes clavier et manette.
-   Paramètres audio, vidéo et commandes.

Ne pas développer tout ce contenu avant que le prototype de combat soit
satisfaisant.

------------------------------------------------------------------------

## 3. Direction artistique et gameplay

### Perspective et rendu

-   Vue 2D latérale avec caméra qui suit le joueur.
-   Résolution interne de référence : **480 × 270**, à ajuster après les
    premiers tests.
-   Pixel art HD avec mise à l'échelle entière lorsque possible.
-   Filtrage adapté au pixel art (`pixelArt: true` dans Phaser).
-   Animations fluides et lisibles.
-   Effets visuels sobres : impacts, poussière, particules et effets de
    magie.
-   Les éléments de décor ne doivent pas gêner la lecture des ennemis ou
    des attaques.

### Commandes proposées

  Touche           Action
  ---------------- -----------------------------
  Q / D ou A / D   Déplacement gauche / droite
  Espace ou Z      Saut
  J                Attaque légère
  K                Attaque lourde
  L                Esquive
  I                Parade
  F                Interaction
  E                Utiliser une fiole
  Échap            Pause

Prévoir une configuration des touches et une prise en charge de la
manette. Les commandes doivent être affichées dans le menu des
paramètres.

### Système de combat

Le combat repose sur trois ressources ou états :

-   **Vie (PV) :** diminue lorsque le joueur subit des dégâts.
-   **Endurance :** consommée par les attaques, les esquives et
    certaines parades.
-   **Volonté :** ressource destinée aux pouvoirs spéciaux, à intégrer
    après le MVP.

Règles à implémenter :

1.  Les attaques ont une préparation, une fenêtre active et une
    récupération.
2.  Les hitboxes ne sont actives que pendant la fenêtre d'attaque.
3.  Une esquive possède une durée et une fenêtre d'invulnérabilité
    définies.
4.  Une parade réussie dépend du timing et ouvre une possibilité de
    riposte.
5.  Une action impossible faute d'endurance ne doit pas être exécutée.
6.  Les dégâts, temps de récupération et coûts doivent être
    configurables.
7.  Le joueur doit pouvoir comprendre pourquoi il a été touché.

### Mort, cendres et sanctuaires

-   À la mort, le joueur laisse ses cendres à son dernier emplacement de
    décès.
-   Il réapparaît au dernier sanctuaire activé.
-   Il peut récupérer les cendres en atteignant leur emplacement.
-   Une nouvelle mort avant récupération remplace les cendres
    précédentes.
-   L'activation d'un sanctuaire restaure les ressources prévues et
    réinitialise les ennemis concernés.
-   Les règles de sauvegarde doivent être clairement expliquées au
    joueur.

### Progression

Attributs envisagés :

  Attribut    Effet
  ----------- ------------------------------------------------
  Vitalité    Augmente les PV
  Force       Augmente les dégâts physiques
  Endurance   Augmente l'endurance maximale
  Agilité     Peut améliorer certaines capacités de mobilité
  Volonté     Renforce les pouvoirs occultes

Équipements envisagés : épée brisée, épée longue, grande épée, dague,
hallebarde, bouclier, armures, anneaux, fioles et reliques.

Les statistiques et effets doivent être centralisés dans des données
configurables plutôt que dispersés dans le code.

------------------------------------------------------------------------

## 4. Monde et contenu

Le monde est semi-ouvert et interconnecté. Les zones sont reliées par
des portes, ascenseurs, raccourcis et passages secrets.

  -----------------------------------------------------------------------
  Région                  Identité                Boss associé
  ----------------------- ----------------------- -----------------------
  Crypte oubliée          Tutoriel et premiers    Gardien des Cendres
                          ennemis                 

  Forêt des racines       Pièges, secrets et      Mère des Racines
                          végétation maudite      

  Village déchu           PNJ, quêtes et          Bourreau sans visage
                          équipements             

  Cathédrale noire        Magie et chevaliers     Ange déchu
                          corrompus               

  Trône du silence        Dernière région et      Roi du Silence
                          conclusion              
  -----------------------------------------------------------------------

Boss prévus :

1.  **Le Gardien des Cendres :** ancien chevalier, attaques lourdes et
    deux phases.
2.  **La Mère des Racines :** contrôle du terrain et attaques à
    distance.
3.  **Le Bourreau sans visage :** mobilité élevée et pression sur le
    joueur.
4.  **L'Ange déchu :** attaques aériennes et magie.
5.  **Le Roi du Silence :** boss final à plusieurs phases.

Ces noms et mécaniques sont des propositions de conception. Ils pourront
évoluer pendant les tests.

------------------------------------------------------------------------

## 5. Architecture technique

### Choix technologiques

  -----------------------------------------------------------------------
  Élément                 Technologie             Rôle
  ----------------------- ----------------------- -----------------------
  Moteur 2D               Phaser 3                Scènes, rendu,
                                                  animations, physique et
                                                  entrées

  Langage client          TypeScript              Logique du jeu et
                                                  typage

  Outil de développement  Vite                    Serveur local et
                                                  compilation

  API                     Node.js + Express       Comptes, progression et
                                                  sauvegardes distantes

  Base de données         PostgreSQL              Données persistantes

  Serveur Web             Nginx                   Distribution du jeu
                                                  compilé et proxy API

  Conteneurs              Docker Compose          Environnement
                                                  reproductible

  Cartes                  Tiled                   Création des niveaux

  Sprites                 Aseprite ou outil       Personnages, ennemis et
                          équivalent              animations

  Audio                   Audacity ou outil       Préparation des sons
                          équivalent              
  -----------------------------------------------------------------------

### Règle d'architecture importante

Le jeu doit rester jouable même si l'API est temporairement
indisponible. Les combats, déplacements, ennemis et scènes s'exécutent
dans le navigateur. Le serveur intervient pour les comptes et la
synchronisation des sauvegardes, pas pour calculer chaque mouvement ou
chaque coup.

Pour le MVP, commencer par une sauvegarde locale. Ajouter les comptes et
la sauvegarde distante seulement après validation du gameplay.

### Schéma logique

``` text
Navigateur
  └── Jeu Phaser + TypeScript
        ├── Scènes et interface
        ├── Personnage et ennemis
        ├── Combat et collisions
        ├── Cartes et progression
        └── Client API
              └── Nginx / API
                    └── Node.js + Express
                          └── PostgreSQL
```

------------------------------------------------------------------------

## 6. Organisation des dossiers

Structure cible proposée :

``` text
ashen-oath/
├── README.md
├── docker-compose.yml
├── .env.example
├── .gitignore
│
├── client/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── public/
│   │   └── assets/
│   │       ├── sprites/
│   │       ├── backgrounds/
│   │       ├── tilesets/
│   │       ├── audio/
│   │       └── fonts/
│   └── src/
│       ├── main.ts
│       ├── config/
│       ├── scenes/
│       ├── entities/
│       ├── combat/
│       ├── systems/
│       ├── maps/
│       ├── ui/
│       ├── data/
│       ├── services/
│       └── styles/
│
├── server/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── app.ts
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── middleware/
│       ├── database/
│       └── validation/
│
├── database/
│   └── init.sql
│
├── docs/
│   ├── GAME_DESIGN.md
│   ├── TECHNICAL_DESIGN.md
│   └── TEST_PLAN.md
│
└── tools/
```

Cette structure est une cible à créer progressivement. Ne pas créer des
dizaines de fichiers vides : chaque dossier doit être introduit
lorsqu'une fonctionnalité correspondante commence.

------------------------------------------------------------------------

## 7. Étapes de développement détaillées

### Phase 0 --- Préparer l'environnement

-   [ ] Installer Git.
-   [ ] Installer Docker Desktop et vérifier que le moteur Docker
    fonctionne.
-   [ ] Installer Node.js LTS pour le développement local.
-   [ ] Installer VS Code ou un éditeur équivalent.
-   [ ] Installer Tiled.
-   [ ] Préparer Aseprite ou un outil de pixel art.
-   [ ] Créer le dépôt Git.
-   [ ] Créer la structure minimale du projet.
-   [ ] Ajouter `.gitignore` et `.env.example`.
-   [ ] Documenter les versions des outils.

**Validation :** le dépôt existe, les outils sont opérationnels et le
projet peut être lancé localement.

### Phase 1 --- Initialiser le jeu

-   [ ] Initialiser le client avec Vite et TypeScript.
-   [ ] Installer une version stable de Phaser 3.
-   [ ] Configurer la résolution et le redimensionnement.
-   [ ] Créer `BootScene`, `PreloadScene`, `MenuScene` et `GameScene`.
-   [ ] Charger un premier décor temporaire.
-   [ ] Afficher le jeu dans le navigateur.
-   [ ] Ajouter un écran de chargement et la gestion des erreurs de
    chargement.

**Validation :** le jeu démarre sans erreur et affiche une scène
jouable.

### Phase 2 --- Déplacements et physique

-   [ ] Ajouter le personnage temporaire.
-   [ ] Implémenter déplacement gauche/droite.
-   [ ] Implémenter saut et gravité.
-   [ ] Ajouter plateformes et collisions.
-   [ ] Configurer la caméra.
-   [ ] Gérer les limites du niveau.
-   [ ] Éviter les doubles sauts non autorisés.
-   [ ] Tester les bords, pentes éventuelles et chutes.

**Validation :** le personnage se déplace de manière fiable et ne
traverse pas le décor.

### Phase 3 --- Animations et commandes

-   [ ] Préparer les spritesheets.
-   [ ] Ajouter idle, marche, saut et chute.
-   [ ] Ajouter attaque, esquive, parade, dégâts et mort.
-   [ ] Gérer les transitions entre animations.
-   [ ] Éviter les interruptions incohérentes.
-   [ ] Ajouter la configuration des commandes.
-   [ ] Tester le clavier et la manette.

**Validation :** chaque action possède une animation adaptée et les
entrées restent réactives.

### Phase 4 --- Combat du joueur

-   [ ] Définir les statistiques du personnage.
-   [ ] Créer la barre de vie.
-   [ ] Créer la barre d'endurance.
-   [ ] Ajouter attaque légère.
-   [ ] Ajouter attaque lourde.
-   [ ] Ajouter esquive et fenêtre d'invulnérabilité.
-   [ ] Ajouter parade et riposte.
-   [ ] Ajouter hitboxes et hurtboxes.
-   [ ] Ajouter dégâts, recul et invincibilité temporaire après impact.
-   [ ] Ajouter les effets sonores et visuels.
-   [ ] Tester les coûts d'endurance et les temps de récupération.

**Validation :** le système de combat est cohérent, prévisible et
satisfaisant à jouer.

### Phase 5 --- Ennemis et IA

-   [ ] Créer une classe ou un système d'ennemi réutilisable.
-   [ ] Ajouter patrouille.
-   [ ] Ajouter détection du joueur.
-   [ ] Ajouter poursuite.
-   [ ] Ajouter attaques avec préparation et récupération.
-   [ ] Ajouter réactions aux dégâts.
-   [ ] Ajouter mort et récompenses.
-   [ ] Ajouter plusieurs profils d'ennemis.

**Validation :** un ennemi peut détecter, poursuivre, attaquer et être
vaincu.

### Phase 6 --- Premier boss

-   [ ] Créer une arène dédiée.
-   [ ] Créer le sprite et les animations du boss.
-   [ ] Définir ses états et ses attaques.
-   [ ] Ajouter une barre de vie de boss.
-   [ ] Ajouter une transition de phase.
-   [ ] Ajouter une introduction courte.
-   [ ] Ajouter récompense et état de victoire.
-   [ ] Tester plusieurs stratégies de combat.
-   [ ] Ajuster la difficulté.

**Validation :** le boss peut être vaincu, ses attaques sont lisibles et
le combat ne comporte pas de blocage.

### Phase 7 --- Mort et sanctuaires

-   [ ] Définir le dernier sanctuaire activé.
-   [ ] Créer le système de mort.
-   [ ] Placer les cendres à l'emplacement du décès.
-   [ ] Permettre leur récupération.
-   [ ] Gérer la perte des anciennes cendres lors d'une nouvelle mort.
-   [ ] Réinitialiser les ennemis concernés.
-   [ ] Ajouter les effets visuels et sonores.
-   [ ] Tester les cas limites.

**Validation :** le cycle mort, réapparition et récupération fonctionne
sans perte de données incohérente.

### Phase 8 --- Cartes et exploration

-   [ ] Créer la première carte dans Tiled.
-   [ ] Définir les couches de décor et de collision.
-   [ ] Ajouter les portes et transitions.
-   [ ] Ajouter un sanctuaire.
-   [ ] Ajouter un raccourci.
-   [ ] Ajouter un passage secret.
-   [ ] Ajouter des objets interactifs.
-   [ ] Ajouter une carte ou un système de repérage si nécessaire.

**Validation :** la première région peut être explorée du début à la
fin.

### Phase 9 --- Interface et inventaire

-   [ ] Créer le menu principal.
-   [ ] Créer le HUD.
-   [ ] Créer le menu pause.
-   [ ] Créer l'écran de mort.
-   [ ] Créer l'inventaire.
-   [ ] Ajouter armes et armures.
-   [ ] Ajouter les statistiques.
-   [ ] Ajouter les paramètres audio et commandes.
-   [ ] Vérifier la lisibilité sur différentes résolutions.

**Validation :** toutes les interfaces principales sont utilisables et
ne masquent pas le gameplay.

### Phase 10 --- API et sauvegardes distantes

À commencer lorsque le MVP local est stable.

-   [ ] Initialiser Express et TypeScript.
-   [ ] Configurer PostgreSQL.
-   [ ] Créer les tables utilisateurs et sauvegardes.
-   [ ] Ajouter validation des entrées.
-   [ ] Ajouter inscription et connexion.
-   [ ] Hacher les mots de passe avec un algorithme adapté, par exemple
    Argon2id.
-   [ ] Mettre en place une authentification sécurisée.
-   [ ] Créer les routes de sauvegarde et de chargement.
-   [ ] Valider les données reçues côté serveur.
-   [ ] Gérer les erreurs et les conflits de sauvegarde.
-   [ ] Tester les accès non autorisés.

**Validation :** un utilisateur peut retrouver sa progression après
fermeture et reconnexion.

Ne jamais stocker un mot de passe en clair ou exposer les secrets de
l'API dans le client.

### Phase 11 --- Dockerisation

-   [ ] Créer le Dockerfile du client.
-   [ ] Créer la configuration Nginx.
-   [ ] Créer le Dockerfile du serveur.
-   [ ] Configurer PostgreSQL.
-   [ ] Créer `docker-compose.yml`.
-   [ ] Ajouter un healthcheck pour la base.
-   [ ] Créer un volume persistant.
-   [ ] Configurer les variables d'environnement.
-   [ ] Construire les images.
-   [ ] Lancer les conteneurs.
-   [ ] Tester l'accès au jeu et à l'API.
-   [ ] Vérifier la persistance après redémarrage.

**Validation :** un nouveau développeur peut lancer l'application avec
les instructions Docker du projet.

### Phase 12 --- Tests et publication

-   [ ] Tester les collisions et déplacements.
-   [ ] Tester toutes les actions de combat.
-   [ ] Tester les ennemis et boss.
-   [ ] Tester la mort et les sanctuaires.
-   [ ] Tester les sauvegardes.
-   [ ] Tester les erreurs réseau.
-   [ ] Tester Chrome, Firefox et Opera.
-   [ ] Tester les résolutions d'écran.
-   [ ] Mesurer les performances.
-   [ ] Optimiser les ressources.
-   [ ] Préparer une version de production.
-   [ ] Documenter le déploiement.

**Validation :** aucune anomalie bloquante connue ne subsiste dans le
parcours principal.

------------------------------------------------------------------------

## 8. Instructions d'installation et de lancement

### Prérequis

-   Docker Desktop installé et démarré.
-   Git.
-   Node.js LTS recommandé pour les commandes de développement local.
-   Un navigateur récent.

Vérifier les installations :

``` bash
git --version
node --version
npm --version
docker --version
docker compose version
```

### Lancement en développement

Après initialisation du client :

``` bash
cd client
npm install
npm run dev
```

Vite affiche l'adresse locale à ouvrir dans le navigateur. Le port exact
dépend de sa configuration.

Pour le serveur, après son initialisation :

``` bash
cd server
npm install
npm run dev
```

Les scripts `dev` doivent être définis dans les fichiers `package.json`
correspondants.

### Lancement avec Docker

À la racine du projet, lorsque les Dockerfiles et `docker-compose.yml`
sont prêts :

``` bash
# Construire les images
docker compose build

# Démarrer les services
docker compose up -d

# Vérifier l'état des conteneurs
docker compose ps

# Consulter les journaux
docker compose logs -f

# Arrêter les services sans supprimer les données
docker compose down
```

L'adresse locale prévue pour le jeu est :

``` text
http://localhost:8080
```

Cette adresse suppose que le service Nginx publie bien le port `8080`
sur le port `80` du conteneur.

Pour reconstruire après une modification du code :

``` bash
docker compose up -d --build
```

Pour arrêter et supprimer les conteneurs et le réseau :

``` bash
docker compose down
```

**Attention :** ne pas utiliser `docker compose down -v` sans vouloir
supprimer les volumes, et donc potentiellement les données PostgreSQL.

### Variables d'environnement

Créer un fichier `.env` local à partir de `.env.example`.

Exemple indicatif :

``` env
DB_PASSWORD=remplacer_par_un_secret_solide
JWT_SECRET=remplacer_par_une_cle_longue_et_aleatoire
```

-   Ne jamais envoyer le fichier `.env` sur Git.
-   Ne pas utiliser les valeurs d'exemple en production.
-   Ne pas intégrer `JWT_SECRET` ou le mot de passe PostgreSQL dans le
    code client.
-   Prévoir une procédure de sauvegarde et de restauration de
    PostgreSQL.

------------------------------------------------------------------------

## 9. Tests et critères d'acceptation

### Tests gameplay

-   [ ] Le personnage ne traverse pas les murs ou plateformes solides.
-   [ ] Le saut et la gravité restent stables.
-   [ ] Les attaques ne touchent que dans leur zone active.
-   [ ] L'endurance ne devient jamais négative.
-   [ ] L'esquive respecte sa fenêtre d'invulnérabilité.
-   [ ] Une parade réussie produit le résultat prévu.
-   [ ] Un ennemi peut être vaincu.
-   [ ] Un boss peut changer de phase et mourir correctement.
-   [ ] Le joueur peut mourir et réapparaître.
-   [ ] Les cendres peuvent être récupérées selon les règles prévues.

### Tests techniques

-   [ ] Le client se compile sans erreur TypeScript.
-   [ ] L'API valide les données reçues.
-   [ ] Les routes protégées refusent les utilisateurs non autorisés.
-   [ ] Les secrets ne sont pas présents dans le bundle client.
-   [ ] PostgreSQL conserve les données après redémarrage.
-   [ ] Les conteneurs disposent de journaux exploitables.
-   [ ] Le jeu reste accessible si l'API est indisponible, dans les
    limites du mode local.
-   [ ] Les ressources sont correctement servies en production.

### Objectif de performance

Viser 60 FPS sur un ordinateur raisonnablement récent, tout en testant
sur des machines modestes. Mesurer avant d'optimiser et éviter les
effets graphiques coûteux qui nuisent à la fluidité.

------------------------------------------------------------------------

## 10. Gestion du projet avec Git

Utiliser des commits courts et descriptifs :

``` bash
git init
git add .
git commit -m "chore: initialiser le projet"
```

Exemples de messages :

``` text
feat: ajouter les déplacements du joueur
feat: implémenter l'esquive
feat: ajouter le système d'endurance
fix: corriger les collisions avec les plateformes
feat: créer le premier ennemi
feat: ajouter le premier boss
chore: dockeriser le client et l'api
test: couvrir le système de récupération des cendres
docs: documenter le lancement local
```

Branches recommandées :

-   `main` : versions stables.
-   `develop` : intégration des fonctionnalités.
-   `feature/player-movement` : nouvelle fonctionnalité.
-   `fix/collision-bug` : correction ciblée.

Ne pas fusionner une fonctionnalité non testée dans `main`.

------------------------------------------------------------------------

## 11. Règles de développement

1.  **Construire progressivement.** Une fonctionnalité à la fois, avec
    une validation avant de passer à la suivante.
2.  **Ne pas remplacer le gameplay par des maquettes.** Chaque étape
    doit produire une fonctionnalité réellement jouable.
3.  **Ne pas utiliser de données fictives pour prétendre qu'une
    fonctionnalité est terminée.**
4.  **Séparer les responsabilités.** Le joueur, les ennemis, le combat,
    l'interface et la sauvegarde ne doivent pas être regroupés dans un
    fichier géant.
5.  **Centraliser les paramètres.** Dégâts, endurance, vitesse, temps de
    récupération et statistiques doivent être configurables.
6.  **Tester les régressions.** Une nouvelle mécanique ne doit pas
    casser les déplacements ou les combats déjà validés.
7.  **Gérer les erreurs.** Prévoir les ressources manquantes, les
    erreurs API et les interruptions réseau.
8.  **Respecter les licences.** Utiliser des assets originaux ou dont la
    licence autorise explicitement l'utilisation prévue. Conserver les
    crédits requis.
9.  **Sécuriser les données.** Valider les entrées, protéger les routes
    et ne jamais publier de secrets.
10. **Documenter les décisions.** Mettre à jour ce README lorsque
    l'architecture ou les commandes changent.

------------------------------------------------------------------------

## 12. Ordre de priorité

  Priorité   Travail                           Résultat attendu
  ---------- --------------------------------- ----------------------------------
  P0         Initialisation Phaser             Jeu affiché dans le navigateur
  P0         Déplacements et collisions        Personnage contrôlable
  P0         Combat joueur                     Attaque, esquive, parade
  P0         Premier ennemi                    Combat de base
  P0         Premier boss                      Démo jouable
  P1         Mort et sanctuaire                Boucle Soulslike
  P1         Première région                   Niveau exploratoire
  P1         HUD et inventaire                 Interface utilisable
  P2         API et PostgreSQL                 Comptes et sauvegardes distantes
  P2         Docker de production              Déploiement reproductible
  P3         Régions et boss supplémentaires   Campagne étendue
  P3         PNJ, quêtes et secrets            Contenu enrichi

------------------------------------------------------------------------

## 13. Première tâche à réaliser

**Ne pas commencer par créer les cinq régions.**

La toute première livraison doit contenir :

1.  Un dépôt propre et documenté.
2.  Un client Phaser 3 + TypeScript initialisé avec Vite.
3.  Une scène de jeu affichant un décor temporaire.
4.  Un personnage temporaire contrôlable.
5.  Des plateformes avec collisions.
6.  Une caméra qui suit le personnage.
7.  Un lancement local documenté.

Une fois cette étape testée et validée, commencer les animations, puis
le combat.

### Définition de « terminé »

Une tâche n'est terminée que lorsque :

-   Le code est intégré.
-   Le comportement fonctionne réellement dans le navigateur.
-   Les erreurs de console pertinentes sont corrigées.
-   Les tests associés passent.
-   Les instructions sont à jour.
-   Un commit Git décrit le changement.

------------------------------------------------------------------------

## 14. Liens utiles

-   Phaser : https://phaser.io/
-   Documentation Phaser : https://docs.phaser.io/
-   TypeScript : https://www.typescriptlang.org/docs/
-   Vite : https://vite.dev/guide/
-   Node.js : https://nodejs.org/
-   Express : https://expressjs.com/
-   PostgreSQL : https://www.postgresql.org/docs/
-   Docker : https://docs.docker.com/
-   Docker Compose : https://docs.docker.com/compose/
-   Tiled : https://www.mapeditor.org/
-   Aseprite : https://www.aseprite.org/

------------------------------------------------------------------------

## 15. État d'avancement

Mettre cette section à jour au fil du développement.

-   [ ] Phase 0 --- Environnement
-   [ ] Phase 1 --- Initialisation du jeu
-   [ ] Phase 2 --- Déplacements et physique
-   [ ] Phase 3 --- Animations et commandes
-   [ ] Phase 4 --- Combat du joueur
-   [ ] Phase 5 --- Ennemis et IA
-   [ ] Phase 6 --- Premier boss
-   [ ] Phase 7 --- Mort et sanctuaires
-   [ ] Phase 8 --- Cartes et exploration
-   [ ] Phase 9 --- Interface et inventaire
-   [ ] Phase 10 --- API et sauvegardes distantes
-   [ ] Phase 11 --- Dockerisation
-   [ ] Phase 12 --- Tests et publication

**Rappel :** ce document décrit le plan cible. Les choix de versions,
scripts, ports et configurations devront être vérifiés au moment de
l'initialisation du dépôt.
