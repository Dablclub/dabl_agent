import { IAgentRuntime, ModelClass, generateObject, elizaLogger } from '@elizaos/core';
import { ProjectData, ProjectStage } from '../types/Register';
import { z } from 'zod';

export async function extractProjectData(text: string, runtime: IAgentRuntime): Promise<ProjectData> {
    elizaLogger.info('[🔄 DOUBLE] Extractors - Starting project data extraction');
    elizaLogger.info('[📝 DOUBLE] Extractors - Input text:', text);

    try {
        // Define the schema using Zod
        const projectSchema = z.object({
            name: z.string().min(1, "Project name is required"),
            description: z.string().min(1, "Description is required"),
            repositoryUrl: z.string().url("Must be a valid URL").includes("github.com", "Must be a GitHub repository"),
            productionUrl: z.string().url("Must be a valid URL").nullable(),
            website: z.string().url("Must be a valid URL").nullable(),
            stage: z.enum(['IDEATION', 'PROTOTYPE', 'MVP', 'GROWTH', 'FUNDED'] as const),
            category: z.string().min(1, "Category is required")
        });

        // Generate context for the LLM
        const context = `
Extract project information from the following text:

${text}

Please extract the following details:
- Project name
- Project description
- GitHub repository URL
- Production URL (if available)
- Website (if available)
- Development stage (IDEATION, PROTOTYPE, MVP, GROWTH, or FUNDED)
- Project category

Provide the information in a structured format.`;

        elizaLogger.info('[🤖 DOUBLE] Extractors - Generating object with schema');

        // Use generateObject with Zod schema
        const { object: rawProjectData } = await generateObject({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
            schema: projectSchema
        });

        elizaLogger.info('[📊 DOUBLE] Extractors - Generated raw project data:', rawProjectData);

        // Parse and validate with Zod schema
        const projectData = projectSchema.parse(rawProjectData);
        elizaLogger.info('[✅ DOUBLE] Extractors - Parsed project data:', projectData);

        // Transform the data
        const transformedData = validateAndTransformProjectData(projectData);
        elizaLogger.info('[✅ DOUBLE] Extractors - Validation and transformation complete:', transformedData);

        return transformedData;

    } catch (error) {
        elizaLogger.error('[❌ DOUBLE] Extractors - Failed to extract project data:', error);
        elizaLogger.error('[❌ DOUBLE] Extractors - Error details:', {
            message: error.message,
            stack: error.stack
        });
        throw new Error(`Failed to extract project data: ${error.message}`);
    }
}

function validateAndTransformProjectData(data: z.infer<typeof projectSchema>): ProjectData {
    elizaLogger.info('[🔄 DOUBLE] Extractors - Validating project data');

    // Transform the data to ensure null values for optional fields
    const transformedData: ProjectData = {
        name: data.name,
        description: data.description,
        repositoryUrl: data.repositoryUrl,
        productionUrl: data.productionUrl || null,
        website: data.website || null,
        stage: data.stage,
        category: data.category,
    };

    elizaLogger.info('[✅ DOUBLE] Extractors - Data validation successful');
    return transformedData;
}

// Export the schema for use in other parts of the application
export const projectSchema = z.object({
    name: z.string().min(1, "Project name is required"),
    description: z.string().min(1, "Description is required"),
    repositoryUrl: z.string().url("Must be a valid URL").includes("github.com", "Must be a GitHub repository"),
    productionUrl: z.string().url("Must be a valid URL").nullable(),
    website: z.string().url("Must be a valid URL").nullable(),
    stage: z.enum(['IDEATION', 'PROTOTYPE', 'MVP', 'GROWTH', 'FUNDED'] as const),
    category: z.string().min(1, "Category is required")
});