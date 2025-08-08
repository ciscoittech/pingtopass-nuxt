/**
 * Exam Factory
 * Generate test exam data
 */

export interface ExamFactoryOptions {
  id?: number;
  vendor_id?: number;
  code?: string;
  name?: string;
  passing_score?: number;
  question_count?: number;
  duration_minutes?: number;
  is_active?: boolean;
}

export interface ObjectiveFactoryOptions {
  id?: number;
  exam_id?: number;
  number?: string;
  title?: string;
  weight?: number;
}

let examIdCounter = 1;
let objectiveIdCounter = 1;

export class ExamFactory {
  static create(options: ExamFactoryOptions = {}) {
    const id = options.id || examIdCounter++;
    
    return {
      id,
      vendor_id: options.vendor_id || 1,
      code: options.code || `EX-${id}00`,
      name: options.name || `Test Exam ${id}`,
      passing_score: options.passing_score || 700,
      question_count: options.question_count || 65,
      duration_minutes: options.duration_minutes || 90,
      is_active: options.is_active !== undefined ? options.is_active : true,
      created_at: new Date(),
      updated_at: new Date()
    };
  }
  
  static createWithObjectives(objectiveCount: number = 5) {
    const exam = this.create();
    const objectives = ObjectiveFactory.createBatch(objectiveCount, { exam_id: exam.id });
    
    return {
      ...exam,
      objectives
    };
  }
  
  static createCompTIA(code: string = 'N10-008') {
    return this.create({
      vendor_id: 1,
      code,
      name: `CompTIA ${code}`,
      passing_score: 720,
      question_count: 90,
      duration_minutes: 90
    });
  }
  
  static createCisco(code: string = '200-301') {
    return this.create({
      vendor_id: 2,
      code,
      name: `Cisco ${code}`,
      passing_score: 825,
      question_count: 100,
      duration_minutes: 120
    });
  }
  
  static createMicrosoft(code: string = 'AZ-900') {
    return this.create({
      vendor_id: 3,
      code,
      name: `Microsoft ${code}`,
      passing_score: 700,
      question_count: 60,
      duration_minutes: 85
    });
  }
  
  static createBatch(count: number, options: ExamFactoryOptions = {}) {
    return Array.from({ length: count }, (_, i) => 
      this.create({ ...options, id: (options.id || 0) + i })
    );
  }
  
  static reset() {
    examIdCounter = 1;
    objectiveIdCounter = 1;
  }
}

export class ObjectiveFactory {
  static create(options: ObjectiveFactoryOptions = {}) {
    const id = options.id || objectiveIdCounter++;
    
    return {
      id,
      exam_id: options.exam_id || 1,
      number: options.number || `${Math.floor(id / 10) + 1}.${id % 10}`,
      title: options.title || `Objective ${id}`,
      weight: options.weight || Math.floor(Math.random() * 20) + 10,
      created_at: new Date()
    };
  }
  
  static createBatch(count: number, options: ObjectiveFactoryOptions = {}) {
    const objectives = [];
    let totalWeight = 0;
    
    for (let i = 0; i < count; i++) {
      const weight = i === count - 1 
        ? 100 - totalWeight  // Last objective gets remaining weight
        : Math.floor((100 - totalWeight) / (count - i));
      
      objectives.push(this.create({
        ...options,
        id: (options.id || 0) + i,
        number: `${i + 1}.0`,
        title: `Domain ${i + 1}`,
        weight
      }));
      
      totalWeight += weight;
    }
    
    return objectives;
  }
  
  static createForExam(examId: number, domains: string[]) {
    const weightPerDomain = Math.floor(100 / domains.length);
    let remainingWeight = 100 - (weightPerDomain * domains.length);
    
    return domains.map((domain, index) => {
      const weight = index === domains.length - 1 
        ? weightPerDomain + remainingWeight 
        : weightPerDomain;
      
      return this.create({
        exam_id: examId,
        number: `${index + 1}.0`,
        title: domain,
        weight
      });
    });
  }
}

export class VendorFactory {
  static vendors = [
    { id: 1, code: 'comptia', name: 'CompTIA' },
    { id: 2, code: 'cisco', name: 'Cisco' },
    { id: 3, code: 'microsoft', name: 'Microsoft' },
    { id: 4, code: 'aws', name: 'Amazon Web Services' },
    { id: 5, code: 'google', name: 'Google Cloud' }
  ];
  
  static create(id: number = 1) {
    return this.vendors[id - 1] || this.vendors[0];
  }
  
  static getAll() {
    return [...this.vendors];
  }
}