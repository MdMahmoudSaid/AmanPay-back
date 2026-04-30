// my controoler
import { Request, Response } from "express";
import { EtudiantService } from "../services/etudiantService";

export class EtudiantController {
  private service = new EtudiantService();

  getAll = async (req: Request, res: Response) => {
    const etudiants = await this.service.findAll();
    res.json(etudiants);
  };

  getOne = async (req: Request, res: Response) => {
    const etudiant = await this.service.findById(Number(req.params.id));
    if (!etudiant) return res.status(404).json({ message: "Etudiant non trouvé" });
    res.json(etudiant);
  };

  create = async (req: Request, res: Response) => {
    try {
      const { nomComplet, dateNaissance, classeId, parentId } = req.body;
      const newEtudiant = await this.service.create({ nomComplet, dateNaissance, classeId, parentId });
      res.status(201).json(newEtudiant);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const updated = await this.service.update(Number(req.params.id), req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      await this.service.delete(Number(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };
}

// my routes
import { Router } from "express";
import { EtudiantController } from "../controllers/etudiantController";
import { authMiddleware, authorizeRoles } from "../middlewares/authMiddleware";

const router = Router();
const controller = new EtudiantController();

router.get("/", authMiddleware, authorizeRoles("admin", "comptable"), controller.getAll);
router.get("/:id", authMiddleware, authorizeRoles("admin", "comptable"), controller.getOne);
router.post("/", authMiddleware, authorizeRoles("admin", "comptable"), controller.create);
router.put("/:id", authMiddleware, authorizeRoles("admin", "comptable"), controller.update);
router.delete("/:id", authMiddleware, authorizeRoles("admin"), controller.delete);

export default router;

// in the index inside routes i will import this router
router.use("/etudiants", etudiantRoutes);


// my service
import { AppDataSource } from "../config/database";
import { Etudiant } from "../entities/Etudiant";
import { classes } from "../entities/Classes";
import { ParentProfile } from "../entities/ParentProfile";

export class EtudiantService {
  private repo = AppDataSource.getRepository(Etudiant);
  private classeRepo = AppDataSource.getRepository(classes);
  private parentRepo = AppDataSource.getRepository(ParentProfile);

  async findAll() {
    return await this.repo.find({
      relations: ["classe", "parent"],
    });
  }

  async findById(id: number) {
    return await this.repo.findOne({
      where: { id },
      relations: ["classe", "parent"],
    });
  }

  async create(data: { nomComplet: string; dateNaissance?: Date; classeId: number; parentId: number }) {
    const classe = await this.classeRepo.findOne({ where: { id: data.classeId } });
    if (!classe) throw new Error("Classe introuvable");

    const parent = await this.parentRepo.findOne({ where: { id: data.parentId } });
    if (!parent) throw new Error("Parent introuvable");

    const etudiant = this.repo.create({
      nom_complet: data.nomComplet,
      date_naissance: data.dateNaissance,
      classe,
      parent,
    });

    return await this.repo.save(etudiant);
  }

  async update(id: number, data: Partial<Etudiant> & { classeId?: number; parentId?: number }) {
    const etudiant = await this.findById(id);
    if (!etudiant) throw new Error("Etudiant introuvable");

    if (data.classeId) {
      const classe = await this.classeRepo.findOne({ where: { id: data.classeId } });
      if (!classe) throw new Error("Classe introuvable");
      etudiant.classe = classe;
    }

    if (data.parentId) {
      const parent = await this.parentRepo.findOne({ where: { id: data.parentId } });
      if (!parent) throw new Error("Parent introuvable");
      etudiant.parent = parent;
    }

    if (data.nom_complet) etudiant.nom_complet = data.nom_complet;
    if (data.date_naissance) etudiant.date_naissance = data.date_naissance;

    return await this.repo.save(etudiant);
  }

  async delete(id: number) {
    return await this.repo.delete(id);
  }
}