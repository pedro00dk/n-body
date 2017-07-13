using UnityEngine;

[RequireComponent(typeof(Camera))]
public class NBody : MonoBehaviour
{
    public int N = DEFAULT_N;
    public float Speed = 1.0f;
    public float Softening = 0.1f;
    public float Damping = 0.95f;
    public float PositionScale = 16.0f;
    public float VelocityScale = 1.0f;
    public CreationMode CrMode = CreationMode.Shell;
    public int CrSeed = 127;
    public ComputeShader NBodySolver;
    public Material NBodyMaterial;

    private int n;
    private float currentSpeed;
    private bool paused;

    private ComputeBuffer positionsBuffer;
    private ComputeBuffer velocitiesBuffer;

    private static readonly int DEFAULT_N = 65536;

    private static readonly float THREAD_BLOCK_SIZE = 64;
    private static readonly float TILE_SIZE = 4;

    private float speedVelocitySmooth;

    private void Start()
    {
        n = N + (256 - N % 256);
        currentSpeed = Speed;
        paused = false;

        Random.InitState(CrSeed);

        positionsBuffer = new ComputeBuffer(N, sizeof(float) * 4);
        velocitiesBuffer = new ComputeBuffer(N, sizeof(float) * 4);

        switch (CrMode)
        {
            case CreationMode.Random:
                RandomCreationMode();
                break;

            case CreationMode.Shell:
                ShellCreationMode();
                break;

            case CreationMode.Expand:
                ExpandCreationMode();
                break;
        }
    }

    private void Update()
    {
        paused = Input.GetKeyDown(KeyCode.Space) ? !paused : paused;
        if (paused)
        {
            return;
        }

        currentSpeed = Speed * Mathf.Clamp01(Mathf.SmoothDamp(currentSpeed, currentSpeed + Input.mouseScrollDelta.y * 0.2f, ref speedVelocitySmooth, 0.1f));

        NBodySolver.SetInt("n", n);
        NBodySolver.SetFloat("deltaTime", Time.deltaTime * currentSpeed);
        NBodySolver.SetFloat("softening", Softening);
        NBodySolver.SetFloat("damping", Damping);
        NBodySolver.SetVector("threadDim", new Vector4(THREAD_BLOCK_SIZE, TILE_SIZE, 1, 0));
        NBodySolver.SetVector("groupDim", new Vector4(N / THREAD_BLOCK_SIZE, 1, 1, 0));
        NBodySolver.SetBuffer(0, "positions", positionsBuffer);
        NBodySolver.SetBuffer(0, "velocities", velocitiesBuffer);
        NBodySolver.Dispatch(0, (int) (N / THREAD_BLOCK_SIZE), 1, 1);
    }

    private void OnPostRender()
    {
        NBodyMaterial.SetPass(0);
        NBodyMaterial.SetBuffer("_Positions", positionsBuffer);
        Graphics.DrawProcedural(MeshTopology.Points, N);
    }

    private void OnDestroy()
    {
        positionsBuffer.Release();
        velocitiesBuffer.Release();
    }

    private void RandomCreationMode()
    {
        float positionScale = PositionScale * Mathf.Max(1, N / DEFAULT_N);
        float velocityScale = VelocityScale * positionScale;

        Vector4[] positions = new Vector4[N];
        Vector4[] velocities = new Vector4[N];

        for (int i = 0; i < N; i++)
        {
            positions[i] = Random.insideUnitSphere * positionScale;
            positions[i].w += 1.0f;
            velocities[i] = Random.insideUnitSphere * velocityScale;
            velocities[i].w += 1.0f;
        }

        positionsBuffer.SetData(positions);
        velocitiesBuffer.SetData(velocities);
    }

    private void ShellCreationMode()
    {
        float positionScale = PositionScale;
        float velocityScale = VelocityScale * positionScale;
        float inner = 2.5f * positionScale;
        float outer = 4.0f * positionScale;

        Vector4[] positions = new Vector4[N];
        Vector4[] velocities = new Vector4[N];


        for (int i = 0; i < N; i++)
        {
            positions[i] = Random.insideUnitSphere * (inner + (outer - inner)) * Random.value;
            positions[i].w = 1.0f;

            Vector3 axis = new Vector3(0, 0, 1);
            if (1.0f - Vector3.Dot(positions[i], axis) < 1e-6f)
            {
                axis.x = positions[i].y;
                axis.y = positions[i].x;
                axis.Normalize();
            }
            velocities[i] = Vector3.Cross(positions[i], axis) * velocityScale;
            velocities[i].w = 1.0f;
        }

        positionsBuffer.SetData(positions);
        velocitiesBuffer.SetData(velocities);
    }

    void ExpandCreationMode()
    {
        float positionScale = PositionScale * Mathf.Max(1, N / DEFAULT_N);
        float velocityScale = VelocityScale * positionScale;

        Vector4[] positions = new Vector4[N];
        Vector4[] velocities = new Vector4[N];

        for (int i = 0; i < N; i++)
        {
            positions[i] = Random.insideUnitSphere * positionScale;
            positions[i].w = 1.0f;
            velocities[i] = positions[i] * velocityScale;
            velocities[i].w = 1.0f;
        }

        positionsBuffer.SetData(positions);
        velocitiesBuffer.SetData(velocities);
    }

    public enum CreationMode
    {
        Random,
        Shell,
        Expand
    }
}