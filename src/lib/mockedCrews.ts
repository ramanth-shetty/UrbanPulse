import type { Department } from '@/types/department';

/**
 * Mocked municipal field repair crews for each civic department.
 * HONESTY: These crews are simulated demonstration entities.
 */
export const MOCKED_CREWS: Record<Department, string[]> = {
  water_drainage: [
    'MCC Drainage Quick-Response Crew #2 (Central)',
    'Vani Vilas Waterworks Culvert Repair Team A',
    'Mysuru Stormwater De-silt & Jetting Unit 4',
  ],
  roads: [
    'MCC Rapid Asphalt Patching Squad B',
    'Devaraja Ward Pothole Intervention Unit #1',
    'Chamaraja Division Road Maintenance Team',
  ],
  sanitation: [
    'Kuvempunagar Solid Waste Clearance Route 7',
    'MCC Sanitation Jetting & Debris Squad',
    'Mysuru Central Cleansing Crew #3',
  ],
  electricity: [
    'CESC Line Patrol & Emergency Unit 5',
    'Vijayanagar Substation Wire Restoration Team',
    'Mysuru Streetlight Maintenance Squad C',
  ],
  parks: [
    'MCC Horticulture & Tree Clearance Unit #2',
    'Jayalakshmipuram Park Pruning & Tree Team',
    'Mysuru Urban Forestry Emergency Crew',
  ],
  traffic: [
    'Mysuru Traffic Police Signal Maintenance Unit #1',
    'KR Circle Traffic Signal Electrical Team',
    'Urban Traffic Systems Road Signage Crew',
  ],
};

/**
 * Helper to pick a default crew for a given department.
 */
export function getDefaultMockedCrew(department: Department): string {
  const list = MOCKED_CREWS[department] || MOCKED_CREWS.roads;
  return list[0];
}

