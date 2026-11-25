package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/ulayera/fullstack-calculator/backend/internal/expression"
)

func env(values map[string]string) Lookup {
	return func(key string) (string, bool) {
		v, ok := values[key]
		return v, ok
	}
}

func TestPowerLimitDefaultsWhenUnsetOrEmpty(t *testing.T) {
	for _, values := range []map[string]string{{}, {PowerLimitVar: ""}} {
		limit, err := PowerLimit(env(values))

		require.NoError(t, err)
		assert.Equal(t, int64(expression.DefaultPowerLimit), limit)
	}
}

func TestPowerLimitReadsThePositiveInteger(t *testing.T) {
	limit, err := PowerLimit(env(map[string]string{PowerLimitVar: "500"}))

	require.NoError(t, err)
	assert.Equal(t, int64(500), limit)
}

func TestPowerLimitRejectsInvalidValues(t *testing.T) {
	for _, raw := range []string{"0", "-1", "1e5", "abc", "1.5", " 5"} {
		t.Run(raw, func(t *testing.T) {
			_, err := PowerLimit(env(map[string]string{PowerLimitVar: raw}))

			assert.EqualError(t, err, `POWER_LIMIT must be a positive integer, got "`+raw+`"`)
		})
	}
}
