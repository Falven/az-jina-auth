export const isAllowedAudience = (
	allowedAudiences: readonly string[],
	audience: string | undefined,
): boolean => {
	if (!audience) {
		return false;
	}

	const normalizedAudience = audience.trim().toLowerCase();
	return allowedAudiences.some(
		(candidate) => candidate.trim().toLowerCase() === normalizedAudience,
	);
};
