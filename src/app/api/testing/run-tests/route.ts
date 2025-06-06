import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Store running state
let isTestRunning = false;

export async function POST(request: NextRequest) {
  try {
    if (isTestRunning) {
      return NextResponse.json({
        message: 'Tests are already running',
        status: 'running',
      });
    }
    
    const body = await request.json();
    const { 
      coverage = true, 
      watch = false,
      pattern,
      updateSnapshots = false,
      bail = false
    } = body;
    
    // Get the current port from the request URL
    const currentPort = new URL(request.url).port || '3000';
    
    // Build the test command
    let command = 'npm test --';
    if (coverage) command += ' --coverage';
    if (!watch) command += ' --watchAll=false';
    if (updateSnapshots) command += ' --updateSnapshot';
    if (bail) command += ' --bail';
    if (pattern) command += ` --testNamePattern="${pattern}"`;
    
    // Mark as running
    isTestRunning = true;
    
    // Run tests asynchronously
    execAsync(command, {
      env: {
        ...process.env,
        CI: 'true', // Prevents interactive mode
        FORCE_COLOR: '0', // Disable color output
        PORT: currentPort, // Pass the current port to the test process
        NEXT_PUBLIC_PORT: currentPort,
      },
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    }).then(() => {
      isTestRunning = false;
    }).catch(() => {
      isTestRunning = false;
    });
    
    // Return immediately with a status
    return NextResponse.json({
      message: 'Test run started',
      status: 'running',
      command,
    });
    
  } catch (error) {
    console.error('Error starting test run:', error);
    isTestRunning = false;
    return NextResponse.json(
      { error: 'Failed to start test run' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      status: isTestRunning ? 'running' : 'idle',
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: 'Failed to check test status',
    });
  }
}