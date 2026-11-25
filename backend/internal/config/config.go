package config

import (
	"fmt"
	"strconv"

	"github.com/ulayera/fullstack-calculator/backend/internal/expression"
)

const PowerLimitVar = "POWER_LIMIT"

type Lookup func(key string) (string, bool)

func PowerLimit(lookup Lookup) (int64, error) {
	raw, ok := lookup(PowerLimitVar)
	if !ok || raw == "" {
		return expression.DefaultPowerLimit, nil
	}
	limit, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || limit <= 0 {
		return 0, fmt.Errorf("%s must be a positive integer, got %q", PowerLimitVar, raw)
	}
	return limit, nil
}
