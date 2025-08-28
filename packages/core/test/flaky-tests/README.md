# Intentionally Flaky Tests

⚠️ **WARNING: These are intentionally flaky tests for testing CircleCI's flaky test detection capabilities**

## Purpose

These tests are designed to fail approximately 30% of the time to demonstrate and test CircleCI's ability to detect flaky tests. They simulate real-world scenarios that commonly cause test flakiness:

## Types of Flakiness Simulated

### 1. Timing and Race Conditions (`flakyButtonTests.tsx`)
- Rapid user interactions
- DOM updates with variable timing
- Focus management race conditions
- State transitions with timing dependencies

### 2. Async Operations (`flakyTooltipTests.tsx`)
- Hover/unhover timing issues
- Animation completion dependencies
- Portal rendering delays
- Event propagation timing

### 3. Dialog and Modal Issues (`flakyDialogTests.tsx`)
- Animation timing conflicts
- Portal creation delays
- Event handling propagation
- Z-index calculation timing
- Resize event handling

### 4. Form Validation (`flakyFormTests.tsx`)
- Network simulation with random failures
- Debounced validation timing
- State synchronization issues
- Tab navigation focus management
- Field dependency validation

## Implementation Details

Each test file includes:
- **Random delays** to simulate real-world timing variations
- **Network simulation** with configurable failure rates
- **DOM timing issues** that mirror browser inconsistencies  
- **Event handling race conditions** common in interactive UIs
- **Animation and transition timing** problems

## Failure Rates

Tests are designed to:
- Pass ~70% of the time (success rate)
- Fail ~30% of the time (flaky failures)
- Exhibit different failure patterns across runs

## Usage

These tests should only be run in CI environments for flaky test detection purposes:

```bash
# Run flaky tests specifically
yarn test:karma --grep="flaky"

# Run multiple times to demonstrate flakiness
for i in {1..10}; do yarn test:karma --grep="flaky"; done
```

## DO NOT USE IN PRODUCTION

❌ **Never copy these patterns to real test suites**  
❌ **These are anti-patterns for stable testing**  
❌ **Only for demonstrating flaky test detection**  

## Real-World Prevention

In production tests, avoid:
- Race conditions by using proper `waitFor()` 
- Animation timing issues with deterministic waits
- Network dependencies with proper mocking
- Random delays and timeouts
- Checking state before async operations complete

Use Blueprint's existing test patterns in the other test directories as examples of stable, reliable test practices.
