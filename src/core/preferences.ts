import { promises as fs } from 'fs';
import path from 'path';
import { UserPreferences } from '../ai-providers/ai-provider.js';
import { logger } from './logger.js';

let PREFERENCES_FILE_PATH = path.resolve('./data/preferences/user-preferences.json');

export function setPreferencesFilePath(filePath: string) {
  PREFERENCES_FILE_PATH = filePath;
  userPreferences = null; // Reset cache
}

let userPreferences: UserPreferences | null = null;

export async function loadUserPreferences(): Promise<UserPreferences> {
  if (userPreferences) {
    return userPreferences;
  }

  try {
    const data = await fs.readFile(PREFERENCES_FILE_PATH, 'utf-8');
    userPreferences = JSON.parse(data) as UserPreferences;
    logger.info('User preferences loaded successfully.');
    return userPreferences;
  } catch (error) {
    logger.error('Failed to load user preferences:', error);
    throw new Error('Could not load user preferences.');
  }
}

export function getUserPreferences(): UserPreferences {
  if (!userPreferences) {
    throw new Error('User preferences have not been loaded yet.');
  }
  return userPreferences;
}

function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      const targetValue = (target as any)[key];
      const sourceValue = (source as any)[key];

      if (isObject(targetValue) && isObject(sourceValue)) {
        (output as any)[key] = deepMerge(targetValue, sourceValue);
      } else {
        (output as any)[key] = sourceValue;
      }
    });
  }

  return output;
}

export async function updateUserPreferences(updatedPreferences: Partial<UserPreferences>): Promise<void> {
  if (!userPreferences) {
    await loadUserPreferences();
  }

  userPreferences = deepMerge(userPreferences!, updatedPreferences);

  await saveUserPreferences();
}

async function saveUserPreferences(): Promise<void> {
  if (!userPreferences) {
    logger.warn('No user preferences to save.');
    return;
  }

  try {
    const data = JSON.stringify(userPreferences, null, 2);
    await fs.writeFile(PREFERENCES_FILE_PATH, data, 'utf-8');
    logger.info('User preferences saved successfully.');
  } catch (error) {
    logger.error('Failed to save user preferences:', error);
    throw new Error('Could not save user preferences.');
  }
}
