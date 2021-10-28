import fs from 'fs/promises';
import Bird from './model';

class BirdService {
  #birds: Bird[];

  async load(path: string) {
    const jsonData = await fs.readFile(path, { encoding: 'utf-8' });
    const data = JSON.parse(jsonData);
    if (!Array.isArray(data)) throw new Error('Invalid birds.json format');

    this.#birds = data.map(b => ({
      id: b.latin,
      family: b.family,
      latin: b.latin,
      rare: b.rare,
      name: b.swedish ? b.swedish.toLocaleLowerCase() : b.english,
    }));
  }

  get birds() {
    return this.#birds;
  }
}

const birdService = new BirdService();
export default birdService;
