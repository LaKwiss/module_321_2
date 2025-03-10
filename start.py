import subprocess

def main():
    # Liste des services : (dossier, commande)
    services = [
        ("salazar", "npm start"),
        ("castro", "npm start")
    ]
    
    processes = []
    for folder, command in services:
        p = subprocess.Popen(command, cwd=folder, shell=True)
        processes.append(p)

    for p in processes:
        p.wait()

if __name__ == "__main__":
    main()
